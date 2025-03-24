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
import { fetchCocktails, fetchBottles } from '../services/api';
import type { Cocktail, Bottle } from '../types/types';
import { toast } from 'sonner-native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you're using Expo

export default function CocktailList() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCocktail, setSelectedCocktail] = useState<Cocktail | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderInProgress, setOrderInProgress] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      // Here you would call your API to place the order
      // e.g., await placeOrderApi(selectedCocktail.id, specialInstructions);
      
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Making ${selectedCocktail.name}!`);
      setOrderModalVisible(false);
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setOrderInProgress(false);
    }
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
            style={styles.orderButton}
            onPress={() => openOrderModal(item)}
          >
            <Text style={styles.orderButtonText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cocktail Menu</Text>
      
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
                  style={styles.placeOrderButton}
                  onPress={placeOrder}
                  disabled={orderInProgress}
                >
                  {orderInProgress ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.placeOrderButtonText}>Order Now</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    marginBottom: 15,
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
  placeOrderButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});