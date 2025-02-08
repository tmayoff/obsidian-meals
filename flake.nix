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
            nodePackages.typescript-language-server
            yarn

            pre-commit
            biome
            act
            just

            funzzy
          ];
        };
      }
    );
}
