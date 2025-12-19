export interface Client {
  id: string;
  code: string; // Codice Cliente (es. contabile o interno)
  name: string;
  vatNumber: string; // P.IVA
  address: string;
  contact: string;
  email: string;
  createdAt: string;
}

export interface Movement {
  id: string;
  clientId: string;
  date: string;
  notes: string;
  // Nuovi campi specifici per il calcolo richiesto
  palletsGood: number;      // Epal Buono
  palletsShipping: number;  // Epal Spedizioni
  palletsExchange: number;  // Epal Misto/Scambio
  palletsReturned: number;  // Epal Reso
  operator?: string;        // Operatore che ha registrato il movimento
}

export interface AppData {
  clients: Client[];
  movements: Movement[];
}