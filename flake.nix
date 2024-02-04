{
  description = "Dev environment";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [
          # biome.js
          (final: prev: {
            biome = prev.biome.overrideAttrs (old: {
              version = "1.4.1-nightly.d869a33";
            });
          })
        ];

        pkgs = (import nixpkgs) {
          inherit system overlays;
        };
      in
      {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs;
            [
              nodePackages.svelte-language-server
              nodePackages.typescript-language-server
              bun
              biome
            ];
        };
      }
    );
}
