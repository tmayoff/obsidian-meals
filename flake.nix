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
          (final: prev: {
            wasm-pack = prev.rustPlatform.buildRustPackage rec {
              pname = "wasm-pack";
              version = "0.13.0";

              src = prev.fetchFromGitHub {
                owner = "rustwasm";
                repo = "wasm-pack";
                rev = "refs/tags/v${version}";
                hash = "sha256-NEujk4ZPQ2xHWBCVjBCD7H6f58P4KrwCNoDHKa0d5JE=";
              };

              cargoHash = "sha256-pFKGQcWW1/GaIIWMyWBzts4w1hMu27hTG/uUMjkfDMo=";
              nativeBuildInputs = with prev; [cmake];

              buildInputs = prev.lib.optional prev.stdenv.isDarwin prev.darwin.apple_sdk.frameworks.Security;

              # Most tests rely on external resources and build artifacts.
              # Disabling check here to work with build sandboxing.
              doCheck = false;
            };
          })
        ];

        pkgs = (import nixpkgs) {
          inherit system overlays;
        };
      in {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            nodePackages.svelte-language-server
            nodePackages.typescript-language-server
            bun
            biome
            act
            just
            wasm-pack
          ];
        };
      }
    );
}
