export interface Bottle {
    id: string;
    name: string;
    type: string;
    handlerId: number | null;
  }

  export interface BottleMounted {
    id: string;
    bottle_id: string | null;
    descr: string | null;
    name: number | null;
  }
  
  export interface Cocktail {
    id: string;
    name: string;
    instructions: string;
    ingredients: {
      id: string;
      name: string;
      oz: number;
    }[];
    img_path: string;
  }