// This file is used to validate that TypeScript is working correctly
console.log('TypeScript is working correctly');

// Define a simple interface
interface ValidateMessage {
  message: string;
  timestamp: number;
}

// Create an object that implements the interface
const validation: ValidateMessage = {
  message: 'TypeScript validation successful',
  timestamp: Date.now()
};

console.log(validation);

export {}; 