import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCocktails, fetchBottles } from '../services/api';
import type { Cocktail, Bottle } from '../types/types';
import { toast } from 'sonner-native';

export default function CocktailList() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const checkAvailability = (cocktail: Cocktail) => {
    return cocktail.ingredients.every(ingredient => {
      const bottle = bottles.find(b => b.id === ingredient.bottleId);
      return bottle && bottle.handlerId !== null;
    });
  };

  const makeCocktail = (cocktail: Cocktail) => {
    if (!checkAvailability(cocktail)) {
      toast.error('Missing required bottles in handlers');
      return;
    }
    
    toast.success(`Making ${cocktail.name}...`);
    // Here you would typically send the make request to your backend
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Available Cocktails</Text>
      
      <ScrollView style={styles.cocktailsList}>
        {cocktails.map(cocktail => (
          <View key={cocktail.id} style={styles.cocktailCard}>
            <Image
              source={{ uri: cocktail.image }}
              style={styles.cocktailImage}
            />
            <View style={styles.cocktailInfo}>
              <Text style={styles.cocktailName}>{cocktail.name}</Text>
              <Text style={styles.cocktailInstructions}>{cocktail.instructions}</Text>
              
              <Text style={styles.ingredientsTitle}>Ingredients:</Text>
              {cocktail.ingredients.map(ingredient => {
                const bottle = bottles.find(b => b.id === ingredient.bottleId);
                return (
                  <Text key={ingredient.bottleId} style={styles.ingredient}>
                    • {bottle?.name}: {ingredient.amount}ml
                    {bottle?.handlerId 
                      ? ` (Handler ${bottle.handlerId})`
                      : ' (Not loaded)'}
                  </Text>
                );
              })}
              
              <TouchableOpacity
                style={[
                  styles.makeButton,
                  !checkAvailability(cocktail) && styles.disabledButton
                ]}
                onPress={() => makeCocktail(cocktail)}
                disabled={!checkAvailability(cocktail)}
              >
                <Text style={styles.makeButtonText}>
                  {checkAvailability(cocktail) ? 'Make Cocktail' : 'Missing Bottles'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  cocktailsList: {
    flex: 1,
  },
  cocktailCard: {
    backgroundColor: '#2c2c2c',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cocktailImage: {
    width: '100%',
    height: 200,
  },
  cocktailInfo: {
    padding: 15,
  },
  cocktailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  cocktailInstructions: {
    color: '#CCC',
    marginBottom: 10,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 5,
  },
  ingredient: {
    color: '#CCC',
    marginBottom: 2,
  },
  makeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  makeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});