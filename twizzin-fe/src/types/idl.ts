import { Idl } from '@coral-xyz/anchor';

export type TwizzinIdl = Idl & {
  address: 'CKG9y4fnWgbd83uKR2qzeGVkr2Qo3Fofq21acog3Ae1';
  metadata: {
    name: 'twizzinBe2';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Created with Anchor';
  };
  instructions: [
    {
      name: 'claim';
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210];
      accounts: [
        {
          name: 'player';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'winners';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 105, 110, 110, 101, 114, 115];
              },
              {
                kind: 'account';
                path: 'game';
              }
            ];
          };
        },
        {
          name: 'playerAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 108, 97, 121, 101, 114];
              },
              {
                kind: 'account';
                path: 'game';
              },
              {
                kind: 'account';
                path: 'player';
              }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: 'account';
                path: 'game.token_mint';
                account: 'game';
              }
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: 'playerTokenAccount';
          writable: true;
          optional: true;
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [];
    },
    {
      name: 'closeGame';
      discriminator: [237, 236, 157, 201, 253, 20, 248, 67];
      accounts: [
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'winners';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 105, 110, 110, 101, 114, 115];
              },
              {
                kind: 'account';
                path: 'game';
              }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: 'account';
                path: 'game.token_mint';
                account: 'game';
              }
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [];
    },
    {
      name: 'closePlayerAccount';
      discriminator: [244, 181, 162, 146, 184, 133, 216, 95];
      accounts: [
        {
          name: 'player';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'winners';
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 105, 110, 110, 101, 114, 115];
              },
              {
                kind: 'account';
                path: 'game';
              }
            ];
          };
        },
        {
          name: 'playerAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 108, 97, 121, 101, 114];
              },
              {
                kind: 'account';
                path: 'game';
              },
              {
                kind: 'account';
                path: 'player';
              }
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [];
    },
    {
      name: 'declareWinners';
      discriminator: [42, 228, 213, 39, 88, 35, 143, 71];
      accounts: [
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'winners';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [119, 105, 110, 110, 101, 114, 115];
              },
              {
                kind: 'account';
                path: 'game';
              }
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        {
          name: 'winnerPubkeys';
          type: {
            vec: 'pubkey';
          };
        }
      ];
    },
    {
      name: 'endGame';
      discriminator: [224, 135, 245, 99, 67, 175, 121, 252];
      accounts: [
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: 'account';
                path: 'game.token_mint';
                account: 'game';
              }
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: 'adminTokenAccount';
          writable: true;
          optional: true;
        },
        {
          name: 'treasuryTokenAccount';
          writable: true;
          optional: true;
        },
        {
          name: 'config';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'treasury';
          writable: true;
        }
      ];
      args: [];
    },
    {
      name: 'initConfig';
      discriminator: [23, 235, 115, 232, 168, 96, 1, 231];
      accounts: [
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        {
          name: 'treasuryPubkey';
          type: 'pubkey';
        },
        {
          name: 'treasuryFee';
          type: 'u16';
        }
      ];
    },
    {
      name: 'initGame';
      discriminator: [251, 46, 12, 208, 184, 148, 157, 73];
      accounts: [
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'arg';
                path: 'gameCode';
              }
            ];
          };
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'arg';
                path: 'gameCode';
              }
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          docs: ["The vault's associated token account"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              }
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: 'adminTokenAccount';
          writable: true;
          optional: true;
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        {
          name: 'name';
          type: 'string';
        },
        {
          name: 'gameCode';
          type: 'string';
        },
        {
          name: 'entryFee';
          type: 'u64';
        },
        {
          name: 'commission';
          type: 'u16';
        },
        {
          name: 'startTime';
          type: 'i64';
        },
        {
          name: 'endTime';
          type: 'i64';
        },
        {
          name: 'maxWinners';
          type: 'u8';
        },
        {
          name: 'answerHash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'donationAmount';
          type: 'u64';
        },
        {
          name: 'allAreWinners';
          type: 'bool';
        },
        {
          name: 'evenSplit';
          type: 'bool';
        }
      ];
    },
    {
      name: 'joinGame';
      discriminator: [107, 112, 18, 38, 56, 173, 60, 128];
      accounts: [
        {
          name: 'player';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'playerAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 108, 97, 121, 101, 114];
              },
              {
                kind: 'account';
                path: 'game';
              },
              {
                kind: 'account';
                path: 'player';
              }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          docs: ["The vault's associated token account"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: 'account';
                path: 'game.token_mint';
                account: 'game';
              }
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: 'playerTokenAccount';
          writable: true;
          optional: true;
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [];
    },
    {
      name: 'startGame';
      discriminator: [249, 47, 252, 172, 184, 162, 245, 14];
      accounts: [
        {
          name: 'admin';
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        }
      ];
      args: [
        {
          name: 'totalTime';
          type: 'i64';
        }
      ];
    },
    {
      name: 'submitAnswers';
      discriminator: [142, 178, 58, 248, 113, 129, 119, 142];
      accounts: [
        {
          name: 'player';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'game.admin';
                account: 'game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'playerAccount';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 108, 97, 121, 101, 114];
              },
              {
                kind: 'account';
                path: 'game';
              },
              {
                kind: 'account';
                path: 'player';
              }
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        {
          name: 'answers';
          type: {
            vec: {
              defined: {
                name: 'answerInput';
              };
            };
          };
        },
        {
          name: 'clientFinishTime';
          type: 'i64';
        }
      ];
    },
    {
      name: 'updateConfig';
      discriminator: [29, 158, 252, 191, 10, 83, 219, 99];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 111, 110, 102, 105, 103];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: 'newTreasury';
          type: {
            option: 'pubkey';
          };
        },
        {
          name: 'newTreasuryFee';
          type: {
            option: 'u16';
          };
        }
      ];
    },
    {
      name: 'updateGame';
      discriminator: [159, 61, 132, 131, 3, 234, 209, 220];
      accounts: [
        {
          name: 'admin';
          writable: true;
          signer: true;
        },
        {
          name: 'game';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 97, 109, 101];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: 'account';
                path: 'admin';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'game';
              }
            ];
          };
        },
        {
          name: 'vaultTokenAccount';
          docs: ["The vault's associated token account"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'vault';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              }
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'adminTokenAccount';
          writable: true;
          optional: true;
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        {
          name: 'newName';
          type: {
            option: 'string';
          };
        },
        {
          name: 'newEntryFee';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'newCommission';
          type: {
            option: 'u16';
          };
        },
        {
          name: 'newStartTime';
          type: {
            option: 'i64';
          };
        },
        {
          name: 'newEndTime';
          type: {
            option: 'i64';
          };
        },
        {
          name: 'newMaxWinners';
          type: {
            option: 'u8';
          };
        },
        {
          name: 'newAnswerHash';
          type: {
            option: {
              array: ['u8', 32];
            };
          };
        },
        {
          name: 'newDonationAmount';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'newAllAreWinners';
          type: {
            option: 'bool';
          };
        },
        {
          name: 'newEvenSplit';
          type: {
            option: 'bool';
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: 'game';
      discriminator: [27, 90, 166, 125, 74, 100, 121, 18];
    },
    {
      name: 'playerAccount';
      discriminator: [224, 184, 224, 50, 98, 72, 48, 236];
    },
    {
      name: 'programConfig';
      discriminator: [196, 210, 90, 231, 144, 149, 140, 63];
    },
    {
      name: 'winners';
      discriminator: [124, 173, 245, 175, 40, 115, 199, 91];
    }
  ];
  events: [
    {
      name: 'answersSubmitted';
      discriminator: [134, 16, 126, 37, 27, 132, 173, 113];
    },
    {
      name: 'claimEvent';
      discriminator: [93, 15, 70, 170, 48, 140, 212, 219];
    },
    {
      name: 'gameClosed';
      discriminator: [178, 203, 179, 224, 43, 18, 209, 4];
    },
    {
      name: 'gameCreated';
      discriminator: [218, 25, 150, 94, 177, 112, 96, 2];
    },
    {
      name: 'gameEnded';
      discriminator: [35, 93, 113, 153, 29, 144, 200, 109];
    },
    {
      name: 'gameStarted';
      discriminator: [222, 247, 78, 255, 61, 184, 156, 41];
    },
    {
      name: 'gameUpdated';
      discriminator: [100, 97, 130, 101, 84, 101, 4, 15];
    },
    {
      name: 'playerAccountClosed';
      discriminator: [180, 149, 176, 105, 135, 145, 217, 113];
    },
    {
      name: 'playerJoined';
      discriminator: [39, 144, 49, 106, 108, 210, 183, 38];
    },
    {
      name: 'winnersDeclared';
      discriminator: [60, 25, 114, 88, 126, 49, 88, 136];
    }
  ];
  errors: [
    {
      code: 6000;
      name: 'unauthorizedProgramAuthority';
      msg: 'Unauthorized program authority';
    },
    {
      code: 6001;
      name: 'invalidAuthority';
      msg: 'Invalid authority';
    },
    {
      code: 6002;
      name: 'invalidFee';
      msg: 'Invalid fee';
    },
    {
      code: 6003;
      name: 'treasuryFeeTooHigh';
      msg: "Treasury fee too high - can't be more than 10%";
    },
    {
      code: 6004;
      name: 'treasuryAddressBlank';
      msg: 'Treasury address is blank';
    },
    {
      code: 6005;
      name: 'authorityAddressBlank';
      msg: 'Authority address is blank';
    },
    {
      code: 6006;
      name: 'nameTooLong';
      msg: 'Name has to be between 1 and 32 characters';
    },
    {
      code: 6007;
      name: 'gameCodeTooLong';
      msg: 'Game code has to be between 1 and 16 characters';
    },
    {
      code: 6008;
      name: 'maxWinnersTooLow';
      msg: 'Max winners must be at least 1';
    },
    {
      code: 6009;
      name: 'maxWinnersTooHigh';
      msg: 'Max winners must be less than or equal to 200';
    },
    {
      code: 6010;
      name: 'invalidTimeRange';
      msg: 'Start time is greater than end time';
    },
    {
      code: 6011;
      name: 'tokenMintRequired';
      msg: 'Token mint is required';
    },
    {
      code: 6012;
      name: 'vaultRequired';
      msg: 'Vault is required';
    },
    {
      code: 6013;
      name: 'adminTokenAccountNotProvided';
      msg: 'Admin token account not provided';
    },
    {
      code: 6014;
      name: 'invalidVaultAccount';
      msg: 'Invalid vault account provided';
    },
    {
      code: 6015;
      name: 'invalidTokenAccount';
      msg: 'Invalid token account';
    },
    {
      code: 6016;
      name: 'gameEnded';
      msg: 'Game has ended';
    },
    {
      code: 6017;
      name: 'playerTokenAccountNotProvided';
      msg: 'Player token account not provided';
    },
    {
      code: 6018;
      name: 'playerCountOverflow';
      msg: 'Player count overflow';
    },
    {
      code: 6019;
      name: 'invalidPlayer';
      msg: 'Invalid player';
    },
    {
      code: 6020;
      name: 'invalidGame';
      msg: 'Invalid game';
    },
    {
      code: 6021;
      name: 'alreadySubmitted';
      msg: 'Already submitted';
    },
    {
      code: 6022;
      name: 'gameNotStarted';
      msg: 'Game not started';
    },
    {
      code: 6023;
      name: 'invalidFinishTime';
      msg: 'Invalid finish time';
    },
    {
      code: 6024;
      name: 'invalidAdmin';
      msg: 'Invalid admin';
    },
    {
      code: 6025;
      name: 'numericOverflow';
      msg: 'Numeric overflow';
    },
    {
      code: 6026;
      name: 'vaultTokenAccountNotProvided';
      msg: 'Vault token account not provided';
    },
    {
      code: 6027;
      name: 'treasuryTokenAccountNotProvided';
      msg: 'Treasury token account not provided';
    },
    {
      code: 6028;
      name: 'invalidTreasury';
      msg: 'Invalid treasury';
    },
    {
      code: 6029;
      name: 'gameNotEnded';
      msg: 'Game not ended';
    },
    {
      code: 6030;
      name: 'invalidBasisPoints';
      msg: 'Invalid basis points';
    },
    {
      code: 6031;
      name: 'invalidWinnerCount';
      msg: 'Invalid winner count - must be greater than 0';
    },
    {
      code: 6032;
      name: 'invalidWinnerOrder';
      msg: 'Invalid winner order - winners must be ordered by score and finish time';
    },
    {
      code: 6033;
      name: 'playerNotFinished';
      msg: 'Winner has not finished the game';
    },
    {
      code: 6034;
      name: 'duplicateWinner';
      msg: 'Duplicate winner in list';
    },
    {
      code: 6035;
      name: 'winnerNotPlayer';
      msg: 'Provided winner is not a player in this game';
    },
    {
      code: 6036;
      name: 'notAWinner';
      msg: 'Player is not a winner';
    },
    {
      code: 6037;
      name: 'prizeAlreadyClaimed';
      msg: 'Prize already claimed';
    },
    {
      code: 6038;
      name: 'unclaimedPrizes';
      msg: 'Unclaimed prizes';
    },
    {
      code: 6039;
      name: 'cannotCloseWinnerAccount';
      msg: 'Cannot close winner account';
    }
  ];
  types: [
    {
      name: 'answerInput';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'displayOrder';
            type: 'u8';
          },
          {
            name: 'answer';
            type: 'string';
          },
          {
            name: 'questionId';
            type: 'string';
          },
          {
            name: 'proof';
            type: {
              vec: {
                array: ['u8', 32];
              };
            };
          }
        ];
      };
    },
    {
      name: 'answersSubmitted';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'player';
            type: 'pubkey';
          },
          {
            name: 'numCorrect';
            type: 'u8';
          },
          {
            name: 'finishedTime';
            type: 'i64';
          }
        ];
      };
    },
    {
      name: 'claimEvent';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'player';
            type: 'pubkey';
          },
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'prizeAmount';
            type: 'u64';
          },
          {
            name: 'rank';
            type: 'u8';
          }
        ];
      };
    },
    {
      name: 'game';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'name';
            type: 'string';
          },
          {
            name: 'gameCode';
            type: 'string';
          },
          {
            name: 'tokenMint';
            type: 'pubkey';
          },
          {
            name: 'entryFee';
            type: 'u64';
          },
          {
            name: 'commission';
            type: 'u16';
          },
          {
            name: 'bump';
            type: 'u8';
          },
          {
            name: 'vaultBump';
            type: 'u8';
          },
          {
            name: 'startTime';
            type: 'i64';
          },
          {
            name: 'endTime';
            type: 'i64';
          },
          {
            name: 'maxWinners';
            type: 'u8';
          },
          {
            name: 'totalPlayers';
            type: 'u32';
          },
          {
            name: 'answerHash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'donationAmount';
            type: 'u64';
          },
          {
            name: 'isNative';
            type: 'bool';
          },
          {
            name: 'allAreWinners';
            type: 'bool';
          },
          {
            name: 'evenSplit';
            type: 'bool';
          }
        ];
      };
    },
    {
      name: 'gameClosed';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'recoveredLamports';
            type: 'u64';
          }
        ];
      };
    },
    {
      name: 'gameCreated';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'name';
            type: 'string';
          },
          {
            name: 'gameCode';
            type: 'string';
          },
          {
            name: 'entryFee';
            type: 'u64';
          },
          {
            name: 'startTime';
            type: 'i64';
          },
          {
            name: 'endTime';
            type: 'i64';
          }
        ];
      };
    },
    {
      name: 'gameEnded';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'totalPot';
            type: 'u64';
          },
          {
            name: 'treasuryFee';
            type: 'u64';
          },
          {
            name: 'adminCommission';
            type: 'u64';
          },
          {
            name: 'endTime';
            type: 'i64';
          }
        ];
      };
    },
    {
      name: 'gameStarted';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'startTime';
            type: 'i64';
          },
          {
            name: 'endTime';
            type: 'i64';
          }
        ];
      };
    },
    {
      name: 'gameUpdated';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'name';
            type: 'string';
          },
          {
            name: 'entryFee';
            type: 'u64';
          },
          {
            name: 'startTime';
            type: 'i64';
          },
          {
            name: 'endTime';
            type: 'i64';
          }
        ];
      };
    },
    {
      name: 'playerAccount';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'player';
            type: 'pubkey';
          },
          {
            name: 'joinTime';
            type: 'i64';
          },
          {
            name: 'finishedTime';
            type: 'i64';
          },
          {
            name: 'numCorrect';
            type: 'u8';
          },
          {
            name: 'answerHash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'bump';
            type: 'u8';
          }
        ];
      };
    },
    {
      name: 'playerAccountClosed';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'player';
            type: 'pubkey';
          }
        ];
      };
    },
    {
      name: 'playerJoined';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'player';
            type: 'pubkey';
          },
          {
            name: 'joinTime';
            type: 'i64';
          }
        ];
      };
    },
    {
      name: 'programConfig';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'treasuryPubkey';
            type: 'pubkey';
          },
          {
            name: 'authorityPubkey';
            type: 'pubkey';
          },
          {
            name: 'treasuryFee';
            type: 'u16';
          }
        ];
      };
    },
    {
      name: 'winnerInfo';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'player';
            type: 'pubkey';
          },
          {
            name: 'rank';
            type: 'u8';
          },
          {
            name: 'prizeAmount';
            type: 'u64';
          },
          {
            name: 'claimed';
            type: 'bool';
          }
        ];
      };
    },
    {
      name: 'winners';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'numWinners';
            type: 'u8';
          },
          {
            name: 'winners';
            type: {
              vec: {
                defined: {
                  name: 'winnerInfo';
                };
              };
            };
          },
          {
            name: 'bump';
            type: 'u8';
          }
        ];
      };
    },
    {
      name: 'winnersDeclared';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'game';
            type: 'pubkey';
          },
          {
            name: 'numWinners';
            type: 'u8';
          },
          {
            name: 'totalPrizePool';
            type: 'u64';
          }
        ];
      };
    }
  ];
};
