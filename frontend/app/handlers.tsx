import { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, 
  ScrollView, RefreshControl, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchBottles, fetchBottlesMounted, updateBottleAssignment } from '../services/api';
import type { Cocktail, Bottle, BottleMounted } from '../types/types';
import { toast } from 'sonner-native';

export default function CocktailList() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [bottlesMounted, setBottlesMounted] = useState<BottleMounted[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHandler, setSelectedHandler] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [handlerFilter, setHandlerFilter] = useState('all'); // 'all', 'assigned', 'unassigned'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bottlesData, bottlesMountedData] = await Promise.all([
        fetchBottles(),
        fetchBottlesMounted()
      ]);
      setBottles(bottlesData);
      setBottlesMounted(bottlesMountedData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleBottleAssignment = async (bottleId: number, handlerId: number | null) => {
    if (!handlerId) {
      toast.error('Please select a handler first');
      return;
    }
    
    // Check if bottle is already assigned to another handler
    const bottleCurrentHandler = bottles.find(b => b.id === bottleId.toString())?.handlerId;
    
    if (bottleCurrentHandler) {
      Alert.alert(
        'Reassign Bottle',
        `This bottle is already assigned to handler ${bottleCurrentHandler}. Do you want to reassign it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reassign', onPress: () => processBottleAssignment(bottleId, handlerId) }
        ]
      );
    } else {
      processBottleAssignment(bottleId, handlerId);
    }
  };
  
  const processBottleAssignment = async (bottleId: number, handlerId: number) => {
    try {
      // Show loading indicator
      setLoading(true);
      
      // Call API to update bottle assignment
      await updateBottleAssignment(bottleId, handlerId);
      
      // Refresh data to ensure all states are consistent
      await loadData();
      
      toast.success('Bottle assigned successfully');
    } catch (error) {
      toast.error('Failed to assign bottle');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBottle = async (handlerId: number) => {
    try {
      setLoading(true);
      await updateBottleAssignment(null, handlerId);
      await loadData();
      toast.success('Bottle removed from handler');
    } catch (error) {
      toast.error('Failed to remove bottle');
    } finally {
      setLoading(false);
    }
  };

  const filteredHandlers = bottlesMounted.filter(handler => {
    if (handlerFilter === 'assigned') return handler.bottle_id;
    if (handlerFilter === 'unassigned') return !handler.bottle_id;
    return true;
  });

  const filteredBottles = bottles.filter(bottle => 
    bottle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getHandlerStatusColor = (handler: BottleMounted) => {
    return handler.bottle_id ? '#4CAF50' : '#FF9800';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Handler Management</Text>
      
      {/* Handler filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, handlerFilter === 'all' && styles.activeFilter]}
          onPress={() => setHandlerFilter('all')}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, handlerFilter === 'assigned' && styles.activeFilter]}
          onPress={() => setHandlerFilter('assigned')}
        >
          <Text style={styles.filterText}>Assigned</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, handlerFilter === 'unassigned' && styles.activeFilter]}
          onPress={() => setHandlerFilter('unassigned')}
        >
          <Text style={styles.filterText}>Unassigned</Text>
        </TouchableOpacity>
      </View>
      
      {/* Handlers section */}
      <Text style={styles.sectionTitle}>
        Handlers ({filteredHandlers.length})
      </Text>
      
      <View style={styles.handlersContainer}>
        {filteredHandlers.map(handler => {          
          return (
            <TouchableOpacity
              key={handler.id}
              style={[
                styles.handler,
                selectedHandler === parseInt(handler.id) && styles.selectedHandler,
                { borderLeftColor: getHandlerStatusColor(handler), borderLeftWidth: 5 }
              ]}
              onPress={() => setSelectedHandler(parseInt(handler.id))}
            >
              <Text style={styles.handlerNumber}>
                {handler.id}
              </Text>
              {handler.descr && (
                <Text style={styles.handlerDescription}>{handler.descr}</Text>
              )}
              {handler.bottle_id ? (
                <View style={styles.handlerBottleContainer}>
                  <MaterialCommunityIcons name="bottle-wine" size={16} color="#FFF" />
                  <Text style={styles.handlerBottle} numberOfLines={1} ellipsizeMode="tail">
                    {handler.name}
                  </Text>
                </View>
              ) : (
                <Text style={styles.emptyHandler}>Empty</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected handler details */}
      {selectedHandler && (
        <View style={styles.selectedHandlerDetails}>
          <Text style={styles.selectedHandlerTitle}>
            Handler {selectedHandler}
            {bottlesMounted.find(h => parseInt(h.id) === selectedHandler)?.descr && 
              ` - ${bottlesMounted.find(h => parseInt(h.id) === selectedHandler)?.descr}`
            }
          </Text>
          
          {bottlesMounted.find(h => parseInt(h.id) === selectedHandler)?.bottle_id ? (
            <View style={styles.selectedHandlerContent}>
              <Text style={styles.selectedHandlerBottle}>
                {bottlesMounted.find(h => parseInt(h.id) === selectedHandler)?.name}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveBottle(selectedHandler)}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="#FF5252" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noBottleText}>No bottle assigned</Text>
          )}
        </View>
      )}

      {/* Bottles section */}
      <Text style={styles.sectionTitle}>Available Bottles</Text>
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bottles..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.bottlesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
      >
        {filteredBottles.length === 0 ? (
          <Text style={styles.noBottlesText}>No bottles found</Text>
        ) : (
          filteredBottles.map(bottle => (
            <TouchableOpacity
              key={bottle.id}
              style={[
                styles.bottle,
                bottle.handlerId ? styles.assignedBottle : styles.unassignedBottle
              ]}
              onPress={() => handleBottleAssignment(parseInt(bottle.id), selectedHandler)}
              disabled={!selectedHandler}
            >
              <View style={styles.bottleIconContainer}>
                <MaterialCommunityIcons 
                  name="bottle-wine" 
                  size={24} 
                  color={bottle.handlerId ? "#999" : "#FFF"} 
                />
              </View>
              <View style={styles.bottleInfo}>
                <Text style={styles.bottleName}>{bottle.name}</Text>
                <Text style={styles.bottleHandler}>
                  {bottle.handlerId ? `Assigned to Handler ${bottle.handlerId}` : 'Unassigned'}
                </Text>
              </View>
              {selectedHandler && (
                <MaterialCommunityIcons 
                  name="arrow-right-circle" 
                  size={24} 
                  color="#4CAF50" 
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Helper text */}
      {!selectedHandler && (
        <Text style={styles.helperText}>
          Select a handler to assign bottles
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#2c2c2c',
  },
  activeFilter: {
    backgroundColor: '#4a4a4a',
  },
  filterText: {
    color: '#FFF',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  handlersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  handler: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    overflow: 'hidden',
  },
  selectedHandler: {
    backgroundColor: '#3d3d3d',
    borderColor: '#FFF',
    borderWidth: 1,
  },
  handlerNumber: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  handlerDescription: {
    color: '#CCC',
    fontSize: 10,
    textAlign: 'center',
  },
  handlerBottleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  handlerBottle: {
    color: '#FFF',
    fontSize: 10,
    textAlign: 'center',
    marginLeft: 4,
    maxWidth: '80%',
  },
  emptyHandler: {
    color: '#999',
    fontSize: 10,
    marginTop: 4,
  },
  selectedHandlerDetails: {
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedHandlerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectedHandlerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedHandlerBottle: {
    color: '#FFF',
    fontSize: 14,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  removeButtonText: {
    color: '#FF5252',
    marginLeft: 4,
    fontSize: 12,
  },
  noBottleText: {
    color: '#999',
    fontStyle: 'italic',
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
  },
  bottlesList: {
    flex: 1,
  },
  bottle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  assignedBottle: {
    opacity: 0.7,
  },
  unassignedBottle: {
    borderLeftColor: '#4CAF50',
    borderLeftWidth: 3,
  },
  bottleIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bottleName: {
    color: '#FFF',
    fontSize: 16,
  },
  bottleHandler: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  noBottlesText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  helperText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
  },
});