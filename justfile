format: 
	biome format --write src/

dev: 
	find src/ -name '*.*' | funzzy 'bun run dev'

build: 
	bun run build

test:
	bun test
