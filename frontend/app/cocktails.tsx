import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCocktails, fetchBottles, placeCocktailOrder } from '../services/api';
import type { Cocktail, Bottle } from '../types/types';
import { toast } from 'sonner-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocketIO } from '../services/websocket';

// Define a type for the machine status
interface MachineStatus {
  status: 'available' | 'busy';
  current_operation: string | null;
  start_time: string | null;
  connected_clients: number;
}

export default function CocktailList() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderInProgress, setOrderInProgress] = useState(false);
  
  // Machine status state
  const [machineStatus, setMachineStatus] = useState<MachineStatus>({
    status: 'available',
    current_operation: null,
    start_time: null,
    connected_clients: 0
  });
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  
  // Initialize the socket connection
  const { socketService, isConnected } = useSocketIO('http://172.16.1.116:5000');

  useEffect(() => {
    loadData();
    
    // Setup socket event listeners
    if (socketService) {
      const statusSub = socketService.on('status_update', (data: MachineStatus) => {
        setMachineStatus(data);
      });
      
      const operationStartedSub = socketService.on('operation_started', (data) => {
        setMachineStatus(prev => ({
          ...prev,
          status: 'busy',
          current_operation: data.operation,
          start_time: data.time
        }));
      });
      
      const operationCompletedSub = socketService.on('operation_completed', (data) => {
        setMachineStatus(prev => ({
          ...prev,
          status: 'available',
          current_operation: null,
          start_time: null
        }));
        
        // Show a toast notification when an operation completes
        if (data.operation) {
          toast.success(`${data.operation} completed!`);
        }
      });
      
      // Cleanup subscriptions
      return () => {
        statusSub();
        operationStartedSub();
        operationCompletedSub();
      };
    }
  }, [socketService]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cocktailsData, bottlesData] = await Promise.all([
        fetchCocktails(),
        fetchBottles()
      ]);
      setCocktails(cocktailsData);
      setBottles(bottlesData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCocktails = cocktails.filter(cocktail => 
    cocktail.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openOrderModal = (cocktail: Cocktail) => {
    setSelectedCocktail(cocktail);
    setSpecialInstructions('');
    setOrderModalVisible(true);
  };

  const placeOrder = async () => {
    if (!selectedCocktail) return;
    
    setOrderInProgress(true);
    try {
      // Call the API to place the order
      await placeCocktailOrder(selectedCocktail.id, specialInstructions);
      
      toast.success(`Making ${selectedCocktail.name}!`);
      setOrderModalVisible(false);
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setOrderInProgress(false);
    }
  };

  // Convert ISO date to a more readable format
  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return 'N/A';
    const date = new Date(isoDate);
    return date.toLocaleTimeString();
  };

  // Calculate elapsed time
  const getElapsedTime = (startTime: string | null) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const elapsedMs = now - start;
    
    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading cocktails...</Text>
      </View>
    );
  }

  const renderCocktailItem = ({ item }: { item: Cocktail }) => {
    return (
      <TouchableOpacity 
        style={styles.cocktailCard} 
        onPress={() => openOrderModal(item)}
        activeOpacity={0.7}
        disabled={machineStatus.status === 'busy'}
      >
        <Image
          source={{ uri: item.img_path }}
          style={styles.cocktailImage}
          resizeMode="cover"
        />
        <View style={styles.cocktailInfo}>
          <Text style={styles.cocktailName}>{item.name}</Text>
          <View style={styles.ingredientList}>
            {item.ingredients.slice(0, 3).map((ingredient, idx) => {
              const bottle = bottles.find(b => b.id === ingredient.id);
              return (
                <Text key={idx} style={styles.ingredientPreview}>
                  {bottle?.name}{idx < Math.min(2, item.ingredients.length - 1) ? ', ' : ''}
                </Text>
              );
            })}
            {item.ingredients.length > 3 && (
              <Text style={styles.ingredientPreview}>+{item.ingredients.length - 3} more</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[
              styles.orderButton,
              machineStatus.status === 'busy' && styles.orderButtonDisabled
            ]}
            onPress={() => openOrderModal(item)}
            disabled={machineStatus.status === 'busy'}
          >
            <Text style={styles.orderButtonText}>
              {machineStatus.status === 'busy' ? 'Machine Busy' : 'Order Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Cocktail Menu</Text>
        
        {/* Status LED indicator */}
        <TouchableOpacity 
          style={[
            styles.statusIndicator, 
            { backgroundColor: machineStatus.status === 'available' ? '#4CAF50' : '#FF5252' }
          ]}
          onPress={() => setStatusModalVisible(true)}
        >
          <View style={styles.statusDot}></View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cocktails..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={filteredCocktails}
        renderItem={renderCocktailItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.cocktailsList}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.cocktailsRow}
        onRefresh={loadData}
        refreshing={loading}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="wine" size={64} color="#666" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No cocktails match your search' : 'No cocktails available'}
            </Text>
          </View>
        )}
      />
      
      {/* Cocktail Order Modal */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setOrderModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            
            {selectedCocktail && (
              <>
                <Image
                  source={{ uri: selectedCocktail.img_path }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                
                <Text style={styles.modalTitle}>{selectedCocktail.name}</Text>
                <Text style={styles.modalInstructions}>{selectedCocktail.instructions}</Text>
                
                <Text style={styles.modalSectionTitle}>Ingredients:</Text>
                {selectedCocktail.ingredients.map((ingredient, idx) => {
                  const bottle = bottles.find(b => b.id === ingredient.id);
                  return (
                    <Text key={idx} style={styles.modalIngredient}>
                      • {bottle?.name}: {ingredient.oz}oz
                    </Text>
                  );
                })}
                
                <Text style={styles.modalSectionTitle}>Special Instructions (Optional):</Text>
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="E.g., Less ice, extra strong, etc."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                />
                
                <TouchableOpacity 
                  style={[
                    styles.placeOrderButton,
                    (orderInProgress || machineStatus.status === 'busy') && styles.placeOrderButtonDisabled
                  ]}
                  onPress={placeOrder}
                  disabled={orderInProgress || machineStatus.status === 'busy'}
                >
                  {orderInProgress ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : machineStatus.status === 'busy' ? (
                    <Text style={styles.placeOrderButtonText}>Machine Busy</Text>
                  ) : (
                    <Text style={styles.placeOrderButtonText}>Order Now</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Machine Status Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statusModalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setStatusModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={styles.statusModalTitle}>Machine Status</Text>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <View style={styles.statusValueContainer}>
                <View style={[
                  styles.statusDotLarge,
                  { backgroundColor: machineStatus.status === 'available' ? '#4CAF50' : '#FF5252' }
                ]} />
                <Text style={styles.statusValue}>
                  {machineStatus.status === 'available' ? 'Available' : 'Busy'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Current Operation:</Text>
              <Text style={styles.statusValue}>
                {machineStatus.current_operation || 'None'}
              </Text>
            </View>
            
            {machineStatus.start_time && (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Start Time:</Text>
                  <Text style={styles.statusValue}>
                    {formatDate(machineStatus.start_time)}
                  </Text>
                </View>
                
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Elapsed Time:</Text>
                  <Text style={styles.statusValue}>
                    {getElapsedTime(machineStatus.start_time)}
                  </Text>
                </View>
              </>
            )}
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connected Clients:</Text>
              <Text style={styles.statusValue}>
                {machineStatus.connected_clients}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>WebSocket:</Text>
              <View style={styles.statusValueContainer}>
                <View style={[
                  styles.statusDotSmall,
                  { backgroundColor: isConnected ? '#4CAF50' : '#FF5252' }
                ]} />
                <Text style={styles.statusValue}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.closeStatusButton} 
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.closeStatusButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  statusDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  statusDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  cocktailsList: {
    paddingBottom: 20,
  },
  cocktailsRow: {
    justifyContent: 'space-between',
  },
  cocktailCard: {
    backgroundColor: '#2c2c2c',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    width: '48%',
  },
  cocktailImage: {
    width: '100%',
    height: 150,
  },
  cocktailInfo: {
    padding: 12,
  },
  cocktailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  ingredientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  ingredientPreview: {
    color: '#BBB',
    fontSize: 12,
  },
  orderButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderButtonDisabled: {
    backgroundColor: '#666',
  },
  orderButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  statusModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 80,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  modalInstructions: {
    color: '#CCC',
    marginBottom: 15,
    lineHeight: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 5,
    marginTop: 10,
  },
  modalIngredient: {
    color: '#CCC',
    marginBottom: 2,
  },
  instructionsInput: {
    backgroundColor: '#2c2c2c',
    borderRadius: 10,
    padding: 12,
    color: '#FFF',
    marginTop: 5,
    textAlignVertical: 'top',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    height: 55,
    justifyContent: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#666',
  },
  placeOrderButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Status modal styles
  statusModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusLabel: {
    color: '#CCC',
    fontSize: 16,
  },
  statusValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeStatusButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeStatusButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
});