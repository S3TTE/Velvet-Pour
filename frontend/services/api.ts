// Mock API calls - replace these with your actual API endpoints
var apiurl = "http://127.0.0.1:5000/";

export const fetchBottles = async (): Promise<Bottle[]> => {
  try {
    const response = await fetch(apiurl+'getBottles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: Bottle[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching bottles:', error);
    throw error; // Re-throw to allow handling by the caller
  }
};

export const fetchBottlesMounted = async (): Promise<BottleMounted[]> => {
  try {
    const response = await fetch(apiurl+'getBottlesMounted', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: BottleMounted[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching bottles:', error);
    throw error; // Re-throw to allow handling by the caller
  }
};

export const updateBottleAssignment = async (bottleId:number,handlerId:number): Promise<number> => {
  try {
    const response = await fetch(apiurl+'setBottlesMounted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body:'{"bottleId":'+bottleId+',"handlerId":'+handlerId+'}'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: any = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching bottles:', error);
    throw error; // Re-throw to allow handling by the caller
  }
};
  
export const fetchCocktails = async (): Promise<Cocktail[]> => {
  try {
    const response = await fetch(apiurl+'getDrinkAvaiable', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: any = await response.json();
    for(let i=0;i<data.length;i++){
      let name: string = data[i]["name"].replaceAll(" ","+");
      data[i]["img_path"] = "https://api.a0.dev/assets/image?text=beautiful+"+name+"+cocktail+photography+on+black+background";
    }
    return data;
  } catch (error) {
    console.error('Error fetching bottles:', error);
    throw error; // Re-throw to allow handling by the caller
  }
}
  
export const placeCocktailOrder = async (cocktailId: number, specialInstructions?: string) => {
  try {
    const response = await fetch(apiurl+'prepCocktail/'+cocktailId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: any = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching bottles:', error);
    throw error; // Re-throw to allow handling by the caller
  }
};