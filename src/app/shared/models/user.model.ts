export interface User {
    id: string;
    email: string;
    name: {
        firstname: string;
        lastname: string;
    }
    username: string;  
    age: number;
    height: number;
    weight: number;
    weightHistory?: WeightEntry[];
}

export interface WeightEntry {
    date: Date;
    weight: number;
}