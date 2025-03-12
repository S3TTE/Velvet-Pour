// Mock API calls - replace these with your actual API endpoints
export const fetchBottles = async (): Promise<Bottle[]> => {
    // Simulated API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: '1', name: 'Vodka', type: 'Spirit', handlerId: null },
          { id: '2', name: 'Gin', type: 'Spirit', handlerId: null },
          { id: '3', name: 'Rum', type: 'Spirit', handlerId: null },
          { id: '4', name: 'Tequila', type: 'Spirit', handlerId: null },
          { id: '5', name: 'Triple Sec', type: 'Liqueur', handlerId: null },
        ]);
      }, 1000);
    });
  };
  
  export const fetchCocktails = async (): Promise<Cocktail[]> => {
    // Simulated API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            name: 'Margarita',
            instructions: 'Mix tequila, triple sec, and lime juice',
            ingredients: [
              { bottleId: '4', amount: 60 },
              { bottleId: '5', amount: 30 }
            ],
            image: 'https://api.a0.dev/assets/image?text=beautiful+margarita+cocktail+photography+on+black+background'
          },
          {
            id: '2',
            name: 'Vodka Martini',
            instructions: 'Mix vodka with dry vermouth',
            ingredients: [
              { bottleId: '1', amount: 60 }
            ],
            image: 'https://api.a0.dev/assets/image?text=elegant+vodka+martini+cocktail+photography+on+black+background'
          }
        ]);
      }, 1000);
    });
  };
  
  export const updateBottleHandler = async (bottleId: string, handlerId: number | null): Promise<void> => {
    // Simulated API call
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  };


  /*
  const url = '/vp-api/';

export async function fetchCocktails(bottleLoaded) {
  const response = await fetch(url+'getCocktails', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bottleLoaded),
  });
  const result = await response.json();
  return result;
}

export async function fetchBottles() {
  const response = await fetch(url+'getBt', {
    method: 'GET',
  });
  const result = await response.json();
  return result;
}

export async function fetchBottlesHandler() {
  const response = await fetch(url+'getBtHandler', {
    method: 'GET',
  });
  const result = await response.json();
  return result;
}

export async function setBottlesHandler(bottleLoaded) {
  const response = await fetch(url+'getBtHandler', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bottleLoaded),
  });
  const result = await response.json();
  return result;
}

*/