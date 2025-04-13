# Changelog

## [0.7.0](https://github.com/tmayoff/obsidian-meals/compare/0.6.0...0.7.0) (2025-04-13)


### Features

* add shopping list ignore behaviour for partial, wildcard, and regex matching ([#241](https://github.com/tmayoff/obsidian-meals/issues/241)) ([ac75f4e](https://github.com/tmayoff/obsidian-meals/commit/ac75f4eff6725606eab437d5da6c097331763cc8))
* **dev:** Move the settings page from the builder API to a Svelte page ([#258](https://github.com/tmayoff/obsidian-meals/issues/258)) ([8e62e47](https://github.com/tmayoff/obsidian-meals/commit/8e62e470d377f5d29fdd5f92e7586cda6169c54c))


### Bug Fixes

* Enable debug menus on plugin load ([#261](https://github.com/tmayoff/obsidian-meals/issues/261)) ([4451094](https://github.com/tmayoff/obsidian-meals/commit/4451094a4b35e1883ff8e6a2028c27570b97b9f4))
* fix invalid calculation in shopping list ([#242](https://github.com/tmayoff/obsidian-meals/issues/242)) ([d89787a](https://github.com/tmayoff/obsidian-meals/commit/d89787a53ec929a469ec177ea15d4d3d275779df))
* Nested folders support ([#260](https://github.com/tmayoff/obsidian-meals/issues/260)) ([62d4637](https://github.com/tmayoff/obsidian-meals/commit/62d46374b6a17c06c4a90b2f7d5c2b3d39ce95d0))

## [0.6.0](https://github.com/tmayoff/obsidian-meals/compare/0.5.0...0.6.0) (2025-03-28)


### Features

* Redownload recipes ([#231](https://github.com/tmayoff/obsidian-meals/issues/231)) ([c01e000](https://github.com/tmayoff/obsidian-meals/commit/c01e0001610b370ec21715d7f96d97798fc0ddc7))


### Bug Fixes

* Bump dependencies, recipe-rs now supports more recipes ([#223](https://github.com/tmayoff/obsidian-meals/issues/223)) ([a2355bd](https://github.com/tmayoff/obsidian-meals/commit/a2355bd3fcb9423267dae7db10e7a3705bf32105))
* recipe-rs was failing due to broken scraper  ([#234](https://github.com/tmayoff/obsidian-meals/issues/234)) ([be7ff0f](https://github.com/tmayoff/obsidian-meals/commit/be7ff0f68ad2a872b8da50f794e6ea87b01852f5))
* skip ingredients lines that aren't part of a list ([#226](https://github.com/tmayoff/obsidian-meals/issues/226)) ([98f5a1e](https://github.com/tmayoff/obsidian-meals/commit/98f5a1ec7b5c409cf99591d7eaeb2b48d5314f44))
* TS language server ([#228](https://github.com/tmayoff/obsidian-meals/issues/228)) ([2d7c356](https://github.com/tmayoff/obsidian-meals/commit/2d7c356babb4ec2dbb7eab51a20743e8c6d60a22))

## [0.5.0](https://github.com/tmayoff/obsidian-meals/compare/0.4.0...0.5.0) (2025-02-08)


### Features

* Add to plan button in Recipe notes ([#213](https://github.com/tmayoff/obsidian-meals/issues/213)) ([c75c4ae](https://github.com/tmayoff/obsidian-meals/commit/c75c4aee46efdb1a5aba515e757adf6fb961c55a))


### Bug Fixes

* Unit tests ([#127](https://github.com/tmayoff/obsidian-meals/issues/127)) ([9cf6fa6](https://github.com/tmayoff/obsidian-meals/commit/9cf6fa601aa8d8e96d8a352036e22cd5eb4615c3))
* Updated CI to work on main ([#175](https://github.com/tmayoff/obsidian-meals/issues/175)) ([32257da](https://github.com/tmayoff/obsidian-meals/commit/32257daa3669501710fffc2f0d60558e48339026))

## [0.4.0](https://github.com/tmayoff/obsidian-meals/compare/0.3.0...0.4.0) (2024-10-31)


### Features

* Added the ability to change the start of the week ([#173](https://github.com/tmayoff/obsidian-meals/issues/173)) ([1a3b4bd](https://github.com/tmayoff/obsidian-meals/commit/1a3b4bd7c1ea1e6c8390c75f1158ca4998558c1c))
* Upgrade to Svelte5 ([#169](https://github.com/tmayoff/obsidian-meals/issues/169)) ([a10a894](https://github.com/tmayoff/obsidian-meals/commit/a10a8940972a02642da25a64999f3fda5885b1dd))


### Bug Fixes

* Add hot-reload properly as a submodule for better testing ([#165](https://github.com/tmayoff/obsidian-meals/issues/165)) ([a250dcf](https://github.com/tmayoff/obsidian-meals/commit/a250dcf37a6a0364492e9cde74d926f3d53d80f0))
* Excessive errors on startup ([#168](https://github.com/tmayoff/obsidian-meals/issues/168)) ([30ea2f9](https://github.com/tmayoff/obsidian-meals/commit/30ea2f925c29306cc77ce5954a3b04c2a3eae778))
* Improve error handling with ts-results-es ([#167](https://github.com/tmayoff/obsidian-meals/issues/167)) ([7f00c45](https://github.com/tmayoff/obsidian-meals/commit/7f00c45ece8046ac177af2ed5965fe632dab07d8))
* Sanitize downloaded recipe names ([#172](https://github.com/tmayoff/obsidian-meals/issues/172)) ([268b4ed](https://github.com/tmayoff/obsidian-meals/commit/268b4ed149918a8d8f41a3062d885eb4ce9c5f13))
* The end range for RecipeMD recipes removing 3 characters ([#171](https://github.com/tmayoff/obsidian-meals/issues/171)) ([2664771](https://github.com/tmayoff/obsidian-meals/commit/26647717ead38a70561131dc084f6c294b39bf96))

## [0.3.0](https://github.com/tmayoff/obsidian-meals/compare/0.2.2...0.3.0) (2024-10-29)


### Features

* Bump recipe-rs to support more recipe sites to download ([#160](https://github.com/tmayoff/obsidian-meals/issues/160)) ([0c71713](https://github.com/tmayoff/obsidian-meals/commit/0c717131dc35bda4bf88a6d36307307eecc6cefa))

## [0.2.2](https://github.com/tmayoff/obsidian-meals/compare/0.2.1...0.2.2) (2024-08-20)


### Bug Fixes

* Skip empty ingredient lines '-' with nothing else ([#131](https://github.com/tmayoff/obsidian-meals/issues/131)) ([151bea4](https://github.com/tmayoff/obsidian-meals/commit/151bea43d743d0e20c5f9a8dff2cfc313f6ad6e9))

## [0.2.1](https://github.com/tmayoff/obsidian-meals/compare/0.2.0...0.2.1) (2024-07-13)


### Bug Fixes

* Fix Ingredients with ':' in their text ([#126](https://github.com/tmayoff/obsidian-meals/issues/126)) ([b3f01a3](https://github.com/tmayoff/obsidian-meals/commit/b3f01a3ac6714e0303af1a8f287faae998e71973))
* Fixed regex matching for parentheses ([#125](https://github.com/tmayoff/obsidian-meals/issues/125)) ([b9b969b](https://github.com/tmayoff/obsidian-meals/commit/b9b969bca8ec4696f010f269915076dae2531a0c))
* Fixed the ingredient 'bounding boxes' ([#121](https://github.com/tmayoff/obsidian-meals/issues/121)) ([357ab0a](https://github.com/tmayoff/obsidian-meals/commit/357ab0a95e87f8a8f4f13462e52065163bfe4f7b))

## [0.2.0](https://github.com/tmayoff/obsidian-meals/compare/0.1.1...0.2.0) (2024-07-10)


### Features

* Added some better debugging options/tools ([#115](https://github.com/tmayoff/obsidian-meals/issues/115)) ([ce81bc5](https://github.com/tmayoff/obsidian-meals/commit/ce81bc59c28bc43a5ba18cdb9b1ae4945bb4de62))


### Bug Fixes

* releas-please-manifest.json file name ([#109](https://github.com/tmayoff/obsidian-meals/issues/109)) ([799d769](https://github.com/tmayoff/obsidian-meals/commit/799d7693210a63bed942512322df6fbe14924675))
* Release uploads ([#107](https://github.com/tmayoff/obsidian-meals/issues/107)) ([1dea1f3](https://github.com/tmayoff/obsidian-meals/commit/1dea1f3af31ca2112406d91acc40bcfbbf0599ef))
* release-please config that updates the manifest.json file ([#104](https://github.com/tmayoff/obsidian-meals/issues/104)) ([e7ce367](https://github.com/tmayoff/obsidian-meals/commit/e7ce3671479198d6f9eee0d7f6accb8c3b619807))
* Removed vite-plugin-wasm, was unecessary ([#106](https://github.com/tmayoff/obsidian-meals/issues/106)) ([7e1584c](https://github.com/tmayoff/obsidian-meals/commit/7e1584cfe038d110219b31fc386936550315e2a9))
* Support ingredients that don't start with `-` ([#116](https://github.com/tmayoff/obsidian-meals/issues/116)) ([fff2999](https://github.com/tmayoff/obsidian-meals/commit/fff29990d069116349121901504c4ac3706f62d6))
* This might fix the release-please to use the config file ([#108](https://github.com/tmayoff/obsidian-meals/issues/108)) ([d977d3d](https://github.com/tmayoff/obsidian-meals/commit/d977d3d8cac118333bc92f2784086e18682edd3a))

## [0.1.0](https://github.com/tmayoff/obsidian-meals/compare/0.0.12...v0.1.0) (2024-07-06)


### Features

* update release-please to upload artifacts ([bc594d6](https://github.com/tmayoff/obsidian-meals/commit/bc594d6732f5cab4d9b236c29709ffa09e9739bd))
* Add the ability to scrape recipes ([83]https://github.com/tmayoff/obsidian-meals/pull/83)
