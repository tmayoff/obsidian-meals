default: build

format: 
	biome format --write src/
	biome format --write tests/

dev: 
	find src/ -name '*.*' | funzzy 'bun run dev'

build: 
	bun run build

test:
	bun test
