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
            biome = prev.rustPlatform.buildRustPackage rec {
              pname = "biome";
              version = "1.8.1";

              src = prev.fetchFromGitHub {
                owner = "biomejs";
                repo = "biome";
                rev = "cli/v${version}";
                hash = "sha256-RR4yHrLeEHNLe0Nr8FHm+u+DFJihbibRax41Ss9HDV8=";
              };

              cargoHash = "sha256-xCA1kxt70lrCrPygMe98eF8RC/l47EnJPjLaXBccBRE=";

              nativeBuildInputs = with prev; [
                pkg-config
              ];

              buildInputs = with prev;
                [
                  libgit2
                  rust-jemalloc-sys
                  zlib
                ]
                ++ lib.optionals stdenv.isDarwin [
                  darwin.apple_sdk.frameworks.Security
                ];

              nativeCheckInputs = with prev; [
                git
              ];

              cargoBuildFlags = ["-p=biome_cli"];
              cargoTestFlags =
                cargoBuildFlags
                ++
                # skip a broken test from v1.7.3 release
                # this will be removed on the next version
                ["-- --skip=diagnostics::test::termination_diagnostic_size"];

              env = {
                BIOME_VERSION = version;
                LIBGIT2_NO_VENDOR = 1;
              };

              preCheck = ''
                # tests assume git repository
                git init

                # tests assume $BIOME_VERSION is unset
                unset BIOME_VERSION
              '';
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
          ];
        };
      }
    );
}
