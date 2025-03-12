export interface Bottle {
    id: string;
    name: string;
    type: string;
    handlerId: number | null;
  }
  
  export interface Cocktail {
    id: string;
    name: string;
    instructions: string;
    ingredients: {
      bottleId: string;
      amount: number;
    }[];
    image: string;
  }