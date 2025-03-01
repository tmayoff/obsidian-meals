{
  description = "Dev environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        overlays = [
        ];

        pkgs = (import nixpkgs) {
          inherit system overlays;
        };
      in {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            nodePackages.svelte-language-server
 
            yarn-berry

            biome
            act
            just

            funzzy
          ];
        };
      }
    );
}
