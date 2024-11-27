import { Idl } from '@coral-xyz/anchor';

export type TwizzinIdl = Idl & {
  address: string;
  metadata: {
    name: string;
    version: string;
    spec: string;
    description: string;
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
                account: 'Game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'Game';
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
          name: 'player_account';
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
                account: 'Game';
              },
              {
                kind: 'account';
                path: 'game.game_code';
                account: 'Game';
              }
            ];
          };
        },
        {
          name: 'vault_token_account';
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
                account: 'Game';
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
          name: 'player_token_account';
          writable: true;
          optional: true;
        },
        {
          name: 'token_program';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'system_program';
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'admin' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'winners';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [119, 105, 110, 110, 101, 114, 115] },
              { kind: 'account'; path: 'game' }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [118, 97, 117, 108, 116] },
              { kind: 'account'; path: 'admin' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'vault_token_account';
          writable: true;
          optional: true;
          pda: {
            seeds: [
              { kind: 'account'; path: 'vault' },
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
              { kind: 'account'; path: 'game.token_mint'; account: 'Game' }
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
          name: 'token_program';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associated_token_program';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'system_program';
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'winners';
          optional: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [119, 105, 110, 110, 101, 114, 115] },
              { kind: 'account'; path: 'game' }
            ];
          };
        },
        {
          name: 'player_account';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [112, 108, 97, 121, 101, 114] },
              { kind: 'account'; path: 'game' },
              { kind: 'account'; path: 'player' }
            ];
          };
        },
        {
          name: 'system_program';
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'winners';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [119, 105, 110, 110, 101, 114, 115] },
              { kind: 'account'; path: 'game' }
            ];
          };
        },
        {
          name: 'system_program';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [{ name: 'winner_pubkeys'; type: { vec: 'pubkey' } }];
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [118, 97, 117, 108, 116] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'vault_token_account';
          writable: true;
          optional: true;
          pda: {
            seeds: [
              { kind: 'account'; path: 'vault' },
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
                account: 'Game';
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
          name: 'admin_token_account';
          writable: true;
          optional: true;
        },
        {
          name: 'treasury_token_account';
          writable: true;
          optional: true;
        },
        {
          name: 'config';
          pda: {
            seeds: [{ kind: 'const'; value: [99, 111, 110, 102, 105, 103] }];
          };
        },
        {
          name: 'token_program';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associated_token_program';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'system_program';
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
            seeds: [{ kind: 'const'; value: [99, 111, 110, 102, 105, 103] }];
          };
        },
        {
          name: 'system_program';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        { name: 'treasury_pubkey'; type: 'pubkey' },
        { name: 'treasury_fee'; type: 'u16' }
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'admin' },
              { kind: 'arg'; path: 'game_code' }
            ];
          };
        },
        {
          name: 'token_mint';
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [118, 97, 117, 108, 116] },
              { kind: 'account'; path: 'admin' },
              { kind: 'arg'; path: 'game_code' }
            ];
          };
        },
        {
          name: 'vault_token_account';
          docs: ["The vault's associated token account"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              { kind: 'account'; path: 'vault' },
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
              { kind: 'account'; path: 'token_mint' }
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
          name: 'admin_token_account';
          writable: true;
          optional: true;
        },
        {
          name: 'token_program';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associated_token_program';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'system_program';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        { name: 'name'; type: 'string' },
        { name: 'game_code'; type: 'string' },
        { name: 'entry_fee'; type: 'u64' },
        { name: 'commission'; type: 'u16' },
        { name: 'start_time'; type: 'i64' },
        { name: 'end_time'; type: 'i64' },
        { name: 'max_winners'; type: 'u8' },
        { name: 'answer_hash'; type: { array: ['u8', 32] } },
        { name: 'donation_amount'; type: 'u64' },
        { name: 'all_are_winners'; type: 'bool' },
        { name: 'even_split'; type: 'bool' }
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'player_account';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [112, 108, 97, 121, 101, 114] },
              { kind: 'account'; path: 'game' },
              { kind: 'account'; path: 'player' }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [118, 97, 117, 108, 116] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'vault_token_account';
          docs: ["The vault's associated token account"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              { kind: 'account'; path: 'vault' },
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
              { kind: 'account'; path: 'game.token_mint'; account: 'Game' }
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
          name: 'player_token_account';
          writable: true;
          optional: true;
        },
        {
          name: 'token_program';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associated_token_program';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'system_program';
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'admin' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        }
      ];
      args: [];
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'game.admin'; account: 'Game' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'player_account';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [112, 108, 97, 121, 101, 114] },
              { kind: 'account'; path: 'game' },
              { kind: 'account'; path: 'player' }
            ];
          };
        },
        {
          name: 'system_program';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        {
          name: 'answers';
          type: { vec: { defined: { name: 'AnswerInput' } } };
        },
        { name: 'client_finish_time'; type: 'i64' }
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
            seeds: [{ kind: 'const'; value: [99, 111, 110, 102, 105, 103] }];
          };
        }
      ];
      args: [
        { name: 'new_treasury'; type: { option: 'pubkey' } },
        { name: 'new_treasury_fee'; type: { option: 'u16' } }
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
              { kind: 'const'; value: [103, 97, 109, 101] },
              { kind: 'account'; path: 'admin' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'vault';
          writable: true;
          pda: {
            seeds: [
              { kind: 'const'; value: [118, 97, 117, 108, 116] },
              { kind: 'account'; path: 'admin' },
              { kind: 'account'; path: 'game.game_code'; account: 'Game' }
            ];
          };
        },
        {
          name: 'vault_token_account';
          docs: ["The vault's associated token account"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              { kind: 'account'; path: 'vault' },
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
                path: 'token_mint';
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
          name: 'token_mint';
        },
        {
          name: 'admin_token_account';
          writable: true;
          optional: true;
        },
        {
          name: 'token_program';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associated_token_program';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
        {
          name: 'system_program';
          address: '11111111111111111111111111111111';
        }
      ];
      args: [
        { name: 'new_name'; type: { option: 'string' } },
        { name: 'new_entry_fee'; type: { option: 'u64' } },
        { name: 'new_commission'; type: { option: 'u16' } },
        { name: 'new_start_time'; type: { option: 'i64' } },
        { name: 'new_end_time'; type: { option: 'i64' } },
        { name: 'new_max_winners'; type: { option: 'u8' } },
        { name: 'new_answer_hash'; type: { option: { array: ['u8', 32] } } },
        { name: 'new_donation_amount'; type: { option: 'u64' } },
        { name: 'new_all_are_winners'; type: { option: 'bool' } },
        { name: 'new_even_split'; type: { option: 'bool' } }
      ];
    }
  ];
  accounts: [
    {
      name: 'Game';
      discriminator: [27, 90, 166, 125, 74, 100, 121, 18];
      type: any;
    },
    {
      name: 'PlayerAccount';
      discriminator: [224, 184, 224, 50, 98, 72, 48, 236];
      type: any;
    },
    {
      name: 'ProgramConfig';
      discriminator: [196, 210, 90, 231, 144, 149, 140, 63];
      type: any;
    },
    {
      name: 'Winners';
      discriminator: [124, 173, 245, 175, 40, 115, 199, 91];
      type: any;
    }
  ];
  events: [
    { name: 'AnswersSubmitted'; type: any },
    { name: 'ClaimEvent'; type: any },
    { name: 'GameClosed'; type: any },
    { name: 'GameCreated'; type: any },
    { name: 'GameEnded'; type: any },
    { name: 'GameStarted'; type: any },
    { name: 'GameUpdated'; type: any },
    { name: 'PlayerAccountClosed'; type: any },
    { name: 'PlayerJoined'; type: any },
    { name: 'WinnersDeclared'; type: any }
  ];
  errors: Array<{
    code: number;
    name: string;
    msg: string;
  }>;
  types: [
    { name: 'AnswerInput'; type: any },
    { name: 'WinnerInfo'; type: any }
  ];
};

export const IDL: TwizzinIdl = {
  address: '35V3AqBVBuUVczUxULiZ7eoXbCwVZcNZAN4otDeD4K2F',
  metadata: {
    name: 'twizzin_be_2',
    version: '0.1.0',
    spec: '0.1.0',
    description: 'Created with Anchor',
  },
  instructions: [
    {
      name: 'claim',
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210],
      accounts: [
        {
          name: 'player',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'winners',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [119, 105, 110, 110, 101, 114, 115],
              },
              {
                kind: 'account',
                path: 'game',
              },
            ],
          },
        },
        {
          name: 'player_account',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [112, 108, 97, 121, 101, 114],
              },
              {
                kind: 'account',
                path: 'game',
              },
              {
                kind: 'account',
                path: 'player',
              },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [118, 97, 117, 108, 116],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault_token_account',
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'account',
                path: 'vault',
              },
              {
                kind: 'const',
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: 'account',
                path: 'game.token_mint',
                account: 'Game',
              },
            ],
            program: {
              kind: 'const',
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: 'player_token_account',
          writable: true,
          optional: true,
        },
        {
          name: 'token_program',
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [],
    },
    {
      name: 'closeGame',
      discriminator: [237, 236, 157, 201, 253, 20, 248, 67],
      accounts: [
        {
          name: 'admin',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'winners',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [119, 105, 110, 110, 101, 114, 115],
              },
              {
                kind: 'account',
                path: 'game',
              },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [118, 97, 117, 108, 116],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault_token_account',
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'account',
                path: 'vault',
              },
              {
                kind: 'const',
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: 'account',
                path: 'game.token_mint',
                account: 'Game',
              },
            ],
            program: {
              kind: 'const',
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: 'token_program',
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          name: 'associated_token_program',
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [],
    },
    {
      name: 'closePlayerAccount',
      discriminator: [244, 181, 162, 146, 184, 133, 216, 95],
      accounts: [
        {
          name: 'player',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'winners',
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [119, 105, 110, 110, 101, 114, 115],
              },
              {
                kind: 'account',
                path: 'game',
              },
            ],
          },
        },
        {
          name: 'player_account',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [112, 108, 97, 121, 101, 114],
              },
              {
                kind: 'account',
                path: 'game',
              },
              {
                kind: 'account',
                path: 'player',
              },
            ],
          },
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [],
    },
    {
      name: 'declareWinners',
      discriminator: [42, 228, 213, 39, 88, 35, 143, 71],
      accounts: [
        {
          name: 'admin',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'winners',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [119, 105, 110, 110, 101, 114, 115],
              },
              {
                kind: 'account',
                path: 'game',
              },
            ],
          },
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: 'winner_pubkeys',
          type: {
            vec: 'pubkey',
          },
        },
      ],
    },
    {
      name: 'endGame',
      discriminator: [224, 135, 245, 99, 67, 175, 121, 252],
      accounts: [
        {
          name: 'admin',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [118, 97, 117, 108, 116],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault_token_account',
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'account',
                path: 'vault',
              },
              {
                kind: 'const',
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: 'account',
                path: 'game.token_mint',
                account: 'Game',
              },
            ],
            program: {
              kind: 'const',
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: 'admin_token_account',
          writable: true,
          optional: true,
        },
        {
          name: 'treasury_token_account',
          writable: true,
          optional: true,
        },
        {
          name: 'config',
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: 'token_program',
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          name: 'associated_token_program',
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
        {
          name: 'treasury',
          writable: true,
        },
      ],
      args: [],
    },
    {
      name: 'initConfig',
      discriminator: [23, 235, 115, 232, 168, 96, 1, 231],
      accounts: [
        {
          name: 'admin',
          writable: true,
          signer: true,
        },
        {
          name: 'config',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: 'treasury_pubkey',
          type: 'pubkey',
        },
        {
          name: 'treasury_fee',
          type: 'u16',
        },
      ],
    },
    {
      name: 'initGame',
      discriminator: [251, 46, 12, 208, 184, 148, 157, 73],
      accounts: [
        {
          name: 'admin',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'arg',
                path: 'game_code',
              },
            ],
          },
        },
        {
          name: 'token_mint',
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [118, 97, 117, 108, 116],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'arg',
                path: 'game_code',
              },
            ],
          },
        },
        {
          name: 'vault_token_account',
          docs: ["The vault's associated token account"],
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'account',
                path: 'vault',
              },
              {
                kind: 'const',
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: 'account',
                path: 'token_mint',
              },
            ],
            program: {
              kind: 'const',
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: 'admin_token_account',
          writable: true,
          optional: true,
        },
        {
          name: 'token_program',
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          name: 'associated_token_program',
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'game_code',
          type: 'string',
        },
        {
          name: 'entry_fee',
          type: 'u64',
        },
        {
          name: 'commission',
          type: 'u16',
        },
        {
          name: 'start_time',
          type: 'i64',
        },
        {
          name: 'end_time',
          type: 'i64',
        },
        {
          name: 'max_winners',
          type: 'u8',
        },
        {
          name: 'answer_hash',
          type: {
            array: ['u8', 32],
          },
        },
        {
          name: 'donation_amount',
          type: 'u64',
        },
        {
          name: 'all_are_winners',
          type: 'bool',
        },
        {
          name: 'even_split',
          type: 'bool',
        },
      ],
    },
    {
      name: 'joinGame',
      discriminator: [107, 112, 18, 38, 56, 173, 60, 128],
      accounts: [
        {
          name: 'player',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'player_account',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [112, 108, 97, 121, 101, 114],
              },
              {
                kind: 'account',
                path: 'game',
              },
              {
                kind: 'account',
                path: 'player',
              },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [118, 97, 117, 108, 116],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault_token_account',
          docs: ["The vault's associated token account"],
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'account',
                path: 'vault',
              },
              {
                kind: 'const',
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: 'account',
                path: 'game.token_mint',
                account: 'Game',
              },
            ],
            program: {
              kind: 'const',
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: 'player_token_account',
          writable: true,
          optional: true,
        },
        {
          name: 'token_program',
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          name: 'associated_token_program',
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [],
    },
    {
      name: 'startGame',
      discriminator: [249, 47, 252, 172, 184, 162, 245, 14],
      accounts: [
        {
          name: 'admin',
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: 'submitAnswers',
      discriminator: [142, 178, 58, 248, 113, 129, 119, 142],
      accounts: [
        {
          name: 'player',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'game.admin',
                account: 'Game',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'player_account',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [112, 108, 97, 121, 101, 114],
              },
              {
                kind: 'account',
                path: 'game',
              },
              {
                kind: 'account',
                path: 'player',
              },
            ],
          },
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: 'answers',
          type: {
            vec: {
              defined: {
                name: 'AnswerInput',
              },
            },
          },
        },
        {
          name: 'client_finish_time',
          type: 'i64',
        },
      ],
    },
    {
      name: 'updateConfig',
      discriminator: [29, 158, 252, 191, 10, 83, 219, 99],
      accounts: [
        {
          name: 'authority',
          writable: true,
          signer: true,
        },
        {
          name: 'config',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
      ],
      args: [
        {
          name: 'new_treasury',
          type: {
            option: 'pubkey',
          },
        },
        {
          name: 'new_treasury_fee',
          type: {
            option: 'u16',
          },
        },
      ],
    },
    {
      name: 'updateGame',
      discriminator: [159, 61, 132, 131, 3, 234, 209, 220],
      accounts: [
        {
          name: 'admin',
          writable: true,
          signer: true,
        },
        {
          name: 'game',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [103, 97, 109, 101],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault',
          writable: true,
          pda: {
            seeds: [
              {
                kind: 'const',
                value: [118, 97, 117, 108, 116],
              },
              {
                kind: 'account',
                path: 'admin',
              },
              {
                kind: 'account',
                path: 'game.game_code',
                account: 'Game',
              },
            ],
          },
        },
        {
          name: 'vault_token_account',
          docs: ["The vault's associated token account"],
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: 'account',
                path: 'vault',
              },
              {
                kind: 'const',
                value: [
                  6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206,
                  235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140,
                  245, 133, 126, 255, 0, 169,
                ],
              },
              {
                kind: 'account',
                path: 'token_mint',
              },
            ],
            program: {
              kind: 'const',
              value: [
                140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142,
                13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216,
                219, 233, 248, 89,
              ],
            },
          },
        },
        {
          name: 'token_mint',
        },
        {
          name: 'admin_token_account',
          writable: true,
          optional: true,
        },
        {
          name: 'token_program',
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        },
        {
          name: 'associated_token_program',
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        },
        {
          name: 'system_program',
          address: '11111111111111111111111111111111',
        },
      ],
      args: [
        {
          name: 'new_name',
          type: {
            option: 'string',
          },
        },
        {
          name: 'new_entry_fee',
          type: {
            option: 'u64',
          },
        },
        {
          name: 'new_commission',
          type: {
            option: 'u16',
          },
        },
        {
          name: 'new_start_time',
          type: {
            option: 'i64',
          },
        },
        {
          name: 'new_end_time',
          type: {
            option: 'i64',
          },
        },
        {
          name: 'new_max_winners',
          type: {
            option: 'u8',
          },
        },
        {
          name: 'new_answer_hash',
          type: {
            option: {
              array: ['u8', 32],
            },
          },
        },
        {
          name: 'new_donation_amount',
          type: {
            option: 'u64',
          },
        },
        {
          name: 'new_all_are_winners',
          type: {
            option: 'bool',
          },
        },
        {
          name: 'new_even_split',
          type: {
            option: 'bool',
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'Game',
      discriminator: [27, 90, 166, 125, 74, 100, 121, 18],
    },
    {
      name: 'PlayerAccount',
      discriminator: [224, 184, 224, 50, 98, 72, 48, 236],
    },
    {
      name: 'ProgramConfig',
      discriminator: [196, 210, 90, 231, 144, 149, 140, 63],
    },
    {
      name: 'Winners',
      discriminator: [124, 173, 245, 175, 40, 115, 199, 91],
    },
  ],
  events: [
    {
      name: 'AnswersSubmitted',
      discriminator: [134, 16, 126, 37, 27, 132, 173, 113],
    },
    {
      name: 'ClaimEvent',
      discriminator: [93, 15, 70, 170, 48, 140, 212, 219],
    },
    {
      name: 'GameClosed',
      discriminator: [178, 203, 179, 224, 43, 18, 209, 4],
    },
    {
      name: 'GameCreated',
      discriminator: [218, 25, 150, 94, 177, 112, 96, 2],
    },
    {
      name: 'GameEnded',
      discriminator: [35, 93, 113, 153, 29, 144, 200, 109],
    },
    {
      name: 'GameStarted',
      discriminator: [222, 247, 78, 255, 61, 184, 156, 41],
    },
    {
      name: 'GameUpdated',
      discriminator: [100, 97, 130, 101, 84, 101, 4, 15],
    },
    {
      name: 'PlayerAccountClosed',
      discriminator: [180, 149, 176, 105, 135, 145, 217, 113],
    },
    {
      name: 'PlayerJoined',
      discriminator: [39, 144, 49, 106, 108, 210, 183, 38],
    },
    {
      name: 'WinnersDeclared',
      discriminator: [60, 25, 114, 88, 126, 49, 88, 136],
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'UnauthorizedProgramAuthority',
      msg: 'Unauthorized program authority',
    },
    {
      code: 6001,
      name: 'InvalidAuthority',
      msg: 'Invalid authority',
    },
    {
      code: 6002,
      name: 'InvalidFee',
      msg: 'Invalid fee',
    },
    {
      code: 6003,
      name: 'TreasuryFeeTooHigh',
      msg: "Treasury fee too high - can't be more than 10%",
    },
    {
      code: 6004,
      name: 'TreasuryAddressBlank',
      msg: 'Treasury address is blank',
    },
    {
      code: 6005,
      name: 'AuthorityAddressBlank',
      msg: 'Authority address is blank',
    },
    {
      code: 6006,
      name: 'NameTooLong',
      msg: 'Name has to be between 1 and 32 characters',
    },
    {
      code: 6007,
      name: 'GameCodeTooLong',
      msg: 'Game code has to be between 1 and 16 characters',
    },
    {
      code: 6008,
      name: 'MaxWinnersTooLow',
      msg: 'Max winners must be at least 1',
    },
    {
      code: 6009,
      name: 'MaxWinnersTooHigh',
      msg: 'Max winners must be less than or equal to 200',
    },
    {
      code: 6010,
      name: 'InvalidTimeRange',
      msg: 'Start time is greater than end time',
    },
    {
      code: 6011,
      name: 'TokenMintRequired',
      msg: 'Token mint is required',
    },
    {
      code: 6012,
      name: 'VaultRequired',
      msg: 'Vault is required',
    },
    {
      code: 6013,
      name: 'AdminTokenAccountNotProvided',
      msg: 'Admin token account not provided',
    },
    {
      code: 6014,
      name: 'InvalidVaultAccount',
      msg: 'Invalid vault account provided',
    },
    {
      code: 6015,
      name: 'InvalidTokenAccount',
      msg: 'Invalid token account',
    },
    {
      code: 6016,
      name: 'GameEnded',
      msg: 'Game has ended',
    },
    {
      code: 6017,
      name: 'PlayerTokenAccountNotProvided',
      msg: 'Player token account not provided',
    },
    {
      code: 6018,
      name: 'PlayerCountOverflow',
      msg: 'Player count overflow',
    },
    {
      code: 6019,
      name: 'InvalidPlayer',
      msg: 'Invalid player',
    },
    {
      code: 6020,
      name: 'InvalidGame',
      msg: 'Invalid game',
    },
    {
      code: 6021,
      name: 'AlreadySubmitted',
      msg: 'Already submitted',
    },
    {
      code: 6022,
      name: 'GameNotStarted',
      msg: 'Game not started',
    },
    {
      code: 6023,
      name: 'InvalidFinishTime',
      msg: 'Invalid finish time',
    },
    {
      code: 6024,
      name: 'InvalidAdmin',
      msg: 'Invalid admin',
    },
    {
      code: 6025,
      name: 'NumericOverflow',
      msg: 'Numeric overflow',
    },
    {
      code: 6026,
      name: 'VaultTokenAccountNotProvided',
      msg: 'Vault token account not provided',
    },
    {
      code: 6027,
      name: 'TreasuryTokenAccountNotProvided',
      msg: 'Treasury token account not provided',
    },
    {
      code: 6028,
      name: 'InvalidTreasury',
      msg: 'Invalid treasury',
    },
    {
      code: 6029,
      name: 'GameNotEnded',
      msg: 'Game not ended',
    },
    {
      code: 6030,
      name: 'InvalidBasisPoints',
      msg: 'Invalid basis points',
    },
    {
      code: 6031,
      name: 'InvalidWinnerCount',
      msg: 'Invalid winner count - must be greater than 0',
    },
    {
      code: 6032,
      name: 'InvalidWinnerOrder',
      msg: 'Invalid winner order - winners must be ordered by score and finish time',
    },
    {
      code: 6033,
      name: 'PlayerNotFinished',
      msg: 'Winner has not finished the game',
    },
    {
      code: 6034,
      name: 'DuplicateWinner',
      msg: 'Duplicate winner in list',
    },
    {
      code: 6035,
      name: 'WinnerNotPlayer',
      msg: 'Provided winner is not a player in this game',
    },
    {
      code: 6036,
      name: 'NotAWinner',
      msg: 'Player is not a winner',
    },
    {
      code: 6037,
      name: 'PrizeAlreadyClaimed',
      msg: 'Prize already claimed',
    },
    {
      code: 6038,
      name: 'UnclaimedPrizes',
      msg: 'Unclaimed prizes',
    },
    {
      code: 6039,
      name: 'CannotCloseWinnerAccount',
      msg: 'Cannot close winner account',
    },
  ],
  types: [
    {
      name: 'AnswerInput',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'display_order',
            type: 'u8',
          },
          {
            name: 'answer',
            type: 'string',
          },
          {
            name: 'question_id',
            type: 'string',
          },
          {
            name: 'proof',
            type: {
              vec: {
                array: ['u8', 32],
              },
            },
          },
        ],
      },
    },
    {
      name: 'AnswersSubmitted',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'player',
            type: 'pubkey',
          },
          {
            name: 'num_correct',
            type: 'u8',
          },
          {
            name: 'finished_time',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'ClaimEvent',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'player',
            type: 'pubkey',
          },
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'prize_amount',
            type: 'u64',
          },
          {
            name: 'rank',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'Game',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'admin',
            type: 'pubkey',
          },
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'game_code',
            type: 'string',
          },
          {
            name: 'token_mint',
            type: 'pubkey',
          },
          {
            name: 'entry_fee',
            type: 'u64',
          },
          {
            name: 'commission',
            type: 'u16',
          },
          {
            name: 'bump',
            type: 'u8',
          },
          {
            name: 'vault_bump',
            type: 'u8',
          },
          {
            name: 'start_time',
            type: 'i64',
          },
          {
            name: 'end_time',
            type: 'i64',
          },
          {
            name: 'max_winners',
            type: 'u8',
          },
          {
            name: 'total_players',
            type: 'u32',
          },
          {
            name: 'answer_hash',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'donation_amount',
            type: 'u64',
          },
          {
            name: 'is_native',
            type: 'bool',
          },
          {
            name: 'all_are_winners',
            type: 'bool',
          },
          {
            name: 'even_split',
            type: 'bool',
          },
        ],
      },
    },
    {
      name: 'GameClosed',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'admin',
            type: 'pubkey',
          },
          {
            name: 'recovered_lamports',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'GameCreated',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'admin',
            type: 'pubkey',
          },
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'game_code',
            type: 'string',
          },
          {
            name: 'entry_fee',
            type: 'u64',
          },
          {
            name: 'start_time',
            type: 'i64',
          },
          {
            name: 'end_time',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'GameEnded',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'total_pot',
            type: 'u64',
          },
          {
            name: 'treasury_fee',
            type: 'u64',
          },
          {
            name: 'admin_commission',
            type: 'u64',
          },
          {
            name: 'end_time',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'GameStarted',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'admin',
            type: 'pubkey',
          },
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'start_time',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'GameUpdated',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'admin',
            type: 'pubkey',
          },
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'entry_fee',
            type: 'u64',
          },
          {
            name: 'start_time',
            type: 'i64',
          },
          {
            name: 'end_time',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'PlayerAccount',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'player',
            type: 'pubkey',
          },
          {
            name: 'join_time',
            type: 'i64',
          },
          {
            name: 'finished_time',
            type: 'i64',
          },
          {
            name: 'num_correct',
            type: 'u8',
          },
          {
            name: 'answer_hash',
            type: {
              array: ['u8', 32],
            },
          },
          {
            name: 'bump',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'PlayerAccountClosed',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'player',
            type: 'pubkey',
          },
        ],
      },
    },
    {
      name: 'PlayerJoined',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'player',
            type: 'pubkey',
          },
          {
            name: 'join_time',
            type: 'i64',
          },
        ],
      },
    },
    {
      name: 'ProgramConfig',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'treasury_pubkey',
            type: 'pubkey',
          },
          {
            name: 'authority_pubkey',
            type: 'pubkey',
          },
          {
            name: 'treasury_fee',
            type: 'u16',
          },
        ],
      },
    },
    {
      name: 'WinnerInfo',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'player',
            type: 'pubkey',
          },
          {
            name: 'rank',
            type: 'u8',
          },
          {
            name: 'prize_amount',
            type: 'u64',
          },
          {
            name: 'claimed',
            type: 'bool',
          },
        ],
      },
    },
    {
      name: 'Winners',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'num_winners',
            type: 'u8',
          },
          {
            name: 'winners',
            type: {
              vec: {
                defined: {
                  name: 'WinnerInfo',
                },
              },
            },
          },
          {
            name: 'bump',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'WinnersDeclared',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'game',
            type: 'pubkey',
          },
          {
            name: 'num_winners',
            type: 'u8',
          },
          {
            name: 'total_prize_pool',
            type: 'u64',
          },
        ],
      },
    },
  ],
};
