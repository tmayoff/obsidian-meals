/// <reference types="vite/client" />

// Declare WASM module imports
declare module '*.wasm?url' {
    const content: string;
    export default content;
}
