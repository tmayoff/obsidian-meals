default: build

format: 
	biome format --write src/
	biome format --write tests/

dev: 
	find src/ -name '*.*' | funzzy 'yarn run dev'

build: 
	yarn run build

test:
	yarn test
