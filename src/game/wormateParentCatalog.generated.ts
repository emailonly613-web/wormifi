/* eslint-disable */
/**
 * Generated from the authorized Wormate.io parent catalog.
 * Source: public/assets/parent-wormate/registry.json
 * Revision: 100700
 * Do not hand-edit. Run: node scripts/generate-wormate-parent-catalog.mjs
 */

export const WORMATE_PARENT_REVISION = 100700 as const;
export const WORMATE_PARENT_SKIN_ATLAS_SIZE = { width: 4096, height: 2048 } as const;
export const WORMATE_PARENT_WEAR_ATLAS_SIZE = { width: 2048, height: 2048 } as const;
export const WORMATE_PARENT_ABILITY_ATLAS_SIZE = { width: 256, height: 128 } as const;
export const WORMATE_PARENT_PORTION_ATLAS_SIZE = { width: 512, height: 512 } as const;

export const WORMATE_PARENT_SKIN_GROUPS = [
  {
    "id": "sg0",
    "label": "Simple",
    "skinIds": [
      32,
      33,
      34,
      35
    ]
  },
  {
    "id": "sg1",
    "label": "Striped",
    "skinIds": [
      0,
      1,
      3,
      2,
      6,
      14,
      9,
      8,
      10,
      12
    ]
  },
  {
    "id": "sg2",
    "label": "Patterned",
    "skinIds": [
      21,
      20,
      22,
      19,
      16,
      15,
      18,
      17,
      25,
      23,
      26,
      24,
      27,
      29,
      31
    ]
  },
  {
    "id": "sg3",
    "label": "Flags",
    "skinIds": [
      60,
      65,
      51,
      70,
      71,
      72,
      73,
      90,
      91,
      92,
      95,
      100,
      103,
      105,
      110,
      52,
      117,
      120,
      121,
      122,
      311,
      312,
      313,
      62,
      63,
      129,
      132,
      69,
      79,
      93,
      86,
      87,
      96,
      97,
      98,
      107,
      139,
      154,
      148,
      220,
      127,
      131,
      50,
      75,
      135,
      53,
      112,
      137,
      113,
      134,
      74,
      106,
      149,
      151,
      54,
      152,
      221,
      202,
      80,
      300,
      230,
      104,
      119,
      101,
      128,
      203,
      301,
      58,
      59,
      67,
      77,
      78,
      89,
      307,
      309,
      99,
      102,
      108,
      109,
      114,
      133,
      136,
      138,
      153,
      155,
      156,
      56,
      61,
      157,
      55,
      88,
      82,
      150,
      94,
      308,
      303,
      305,
      126,
      124,
      68,
      314,
      81,
      306,
      310,
      130,
      76,
      84,
      85,
      302,
      115,
      118,
      83,
      116
    ]
  },
  {
    "id": "sg4",
    "label": "Abstraction",
    "skinIds": [
      140,
      141,
      142,
      143,
      144,
      145,
      146,
      147
    ]
  },
  {
    "id": "sg5",
    "label": "Treats",
    "skinIds": [
      160,
      161,
      162,
      163,
      164,
      165,
      166,
      167,
      168,
      169
    ]
  },
  {
    "id": "sg6",
    "label": "Spring",
    "skinIds": [
      170,
      171,
      172,
      173,
      174,
      175,
      176,
      9251,
      9252,
      9253,
      9254,
      9255,
      9256
    ]
  },
  {
    "id": "sg7",
    "label": "Space",
    "skinIds": [
      180,
      181,
      182,
      183,
      184,
      185,
      186,
      187,
      188
    ]
  },
  {
    "id": "sg8",
    "label": "Season of Love",
    "skinIds": [
      9400,
      9401,
      9402,
      9403,
      9404,
      9405,
      9406,
      9407
    ]
  }
] as const;

export const WORMATE_PARENT_SKINS = [
  {
    "id": 32,
    "groupId": "sg0",
    "groupLabel": "Simple",
    "guest": true,
    "nonbuyable": false,
    "prime": "D",
    "base": [
      "LB"
    ],
    "glow": [
      "MB"
    ]
  },
  {
    "id": 33,
    "groupId": "sg0",
    "groupLabel": "Simple",
    "guest": true,
    "nonbuyable": false,
    "prime": "E",
    "base": [
      "NB"
    ],
    "glow": [
      "OB"
    ]
  },
  {
    "id": 34,
    "groupId": "sg0",
    "groupLabel": "Simple",
    "guest": true,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "PB"
    ],
    "glow": [
      "QB"
    ]
  },
  {
    "id": 35,
    "groupId": "sg0",
    "groupLabel": "Simple",
    "guest": true,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "RB"
    ],
    "glow": [
      "SB"
    ]
  },
  {
    "id": 0,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "RB",
      "RB",
      "TB",
      "TB"
    ],
    "glow": [
      "SB",
      "SB",
      "UB",
      "UB"
    ]
  },
  {
    "id": 1,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "H",
    "base": [
      "VB",
      "VB",
      "WB",
      "WB",
      "VB"
    ],
    "glow": [
      "XB",
      "XB",
      "YB",
      "YB",
      "XB"
    ]
  },
  {
    "id": 3,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "E",
    "base": [
      "NB",
      "NB",
      "WB",
      "WB",
      "NB"
    ],
    "glow": [
      "OB",
      "OB",
      "YB",
      "YB",
      "OB"
    ]
  },
  {
    "id": 2,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "I",
    "base": [
      "ZB",
      "ZB",
      "JB",
      "JB",
      "ZB"
    ],
    "glow": [
      "aB",
      "aB",
      "KB",
      "KB",
      "aB"
    ]
  },
  {
    "id": 6,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "E",
    "base": [
      "NB",
      "NB",
      "RB",
      "RB",
      "NB"
    ],
    "glow": [
      "OB",
      "OB",
      "SB",
      "SB",
      "OB"
    ]
  },
  {
    "id": 14,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "PB",
      "PB",
      "PB",
      "JB",
      "JB",
      "JB"
    ],
    "glow": [
      "QB",
      "QB",
      "QB",
      "KB",
      "KB",
      "KB"
    ]
  },
  {
    "id": 9,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "PB",
      "PB",
      "PB",
      "NB",
      "NB",
      "NB",
      "LB",
      "LB",
      "LB"
    ],
    "glow": [
      "QB",
      "QB",
      "QB",
      "OB",
      "OB",
      "OB",
      "MB",
      "MB",
      "MB"
    ]
  },
  {
    "id": 8,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "RB",
      "RB",
      "RB",
      "NB",
      "NB",
      "NB",
      "PB",
      "PB",
      "PB"
    ],
    "glow": [
      "SB",
      "SB",
      "SB",
      "OB",
      "OB",
      "OB",
      "QB",
      "QB",
      "QB"
    ]
  },
  {
    "id": 10,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "J",
    "base": [
      "bB",
      "bB",
      "WB",
      "WB",
      "RB"
    ],
    "glow": [
      "cB",
      "cB",
      "YB",
      "YB",
      "SB"
    ]
  },
  {
    "id": 12,
    "groupId": "sg1",
    "groupLabel": "Striped",
    "guest": false,
    "nonbuyable": false,
    "prime": "H",
    "base": [
      "VB",
      "NB",
      "NB",
      "dB"
    ],
    "glow": [
      "XB",
      "OB",
      "OB",
      "eB"
    ]
  },
  {
    "id": 21,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "J",
    "base": [
      "fB",
      "gB",
      "hB",
      "iB",
      "jB",
      "kB",
      "lB",
      "mB"
    ],
    "glow": [
      "cB"
    ]
  },
  {
    "id": 20,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "nB",
      "oB",
      "pB",
      "qB",
      "rB",
      "sB",
      "tB",
      "uB"
    ],
    "glow": [
      "QB"
    ]
  },
  {
    "id": 22,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "K",
    "base": [
      "vB",
      "wB",
      "xB",
      "yB",
      "zB",
      "0B",
      "1B",
      "2B"
    ],
    "glow": [
      "3B"
    ]
  },
  {
    "id": 19,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "I",
    "base": [
      "4B",
      "5B",
      "6B",
      "7B",
      "8B",
      "9B",
      "+B",
      "/B"
    ],
    "glow": [
      "aB"
    ]
  },
  {
    "id": 16,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "L",
    "base": [
      "AC",
      "BC",
      "CC",
      "DC",
      "EC",
      "FC"
    ],
    "glow": [
      "GC",
      "OB"
    ]
  },
  {
    "id": 15,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "HC",
      "IC",
      "JC",
      "KC",
      "LC",
      "MC"
    ],
    "glow": [
      "QB",
      "OB"
    ]
  },
  {
    "id": 18,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "K",
    "base": [
      "NC",
      "OC",
      "PC",
      "QC",
      "RC",
      "SC"
    ],
    "glow": [
      "3B",
      "OB"
    ]
  },
  {
    "id": 17,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "M",
    "base": [
      "TC",
      "UC",
      "VC",
      "WC",
      "XC",
      "YC"
    ],
    "glow": [
      "ZC",
      "OB"
    ]
  },
  {
    "id": 25,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "J",
    "base": [
      "aC",
      "bC",
      "cC",
      "dC",
      "eC",
      "fC",
      "gC",
      "hC"
    ],
    "glow": [
      "cB",
      "YB",
      "3B"
    ]
  },
  {
    "id": 23,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "E",
    "base": [
      "iC",
      "jC",
      "kC",
      "lC",
      "mC",
      "nC",
      "oC",
      "pC"
    ],
    "glow": [
      "OB",
      "MB",
      "qC"
    ]
  },
  {
    "id": 26,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "N",
    "base": [
      "rC",
      "sC",
      "tC",
      "uC",
      "vC",
      "wC",
      "xC",
      "yC"
    ],
    "glow": [
      "eB",
      "XB",
      "OB"
    ]
  },
  {
    "id": 24,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "K",
    "base": [
      "zC",
      "0C",
      "1C",
      "2C",
      "3C",
      "4C",
      "5C",
      "6C"
    ],
    "glow": [
      "3B",
      "YB",
      "7C"
    ]
  },
  {
    "id": 27,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "O",
    "base": [
      "8C",
      "9C",
      "+C",
      "/C",
      "AD",
      "BD",
      "CD",
      "DD"
    ],
    "glow": [
      "ED",
      "YB",
      "XB"
    ]
  },
  {
    "id": 29,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "P",
    "base": [
      "FD",
      "GD",
      "HD",
      "ID",
      "JD",
      "KD",
      "LD",
      "MD"
    ],
    "glow": [
      "7C",
      "7C",
      "ED",
      "aB",
      "aB",
      "ED"
    ]
  },
  {
    "id": 31,
    "groupId": "sg2",
    "groupLabel": "Patterned",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "ND",
      "OD",
      "PD",
      "QD",
      "RD",
      "SD",
      "TD",
      "UD"
    ],
    "glow": [
      "qC",
      "qC",
      "ED",
      "qC",
      "qC",
      "ED"
    ]
  },
  {
    "id": 60,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "VD",
      "WD",
      "XD",
      "YD",
      "ZD",
      "aD",
      "bD",
      "cD"
    ],
    "glow": [
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 65,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "fD",
      "gD",
      "hD",
      "iD",
      "jD",
      "kD",
      "lD",
      "mD"
    ],
    "glow": [
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 51,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "nD",
      "oD",
      "pD",
      "qD",
      "rD",
      "sD",
      "tD",
      "uD"
    ],
    "glow": [
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 70,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "vD",
      "wD",
      "xD",
      "yD",
      "zD",
      "0D",
      "1D",
      "2D"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "eD",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 71,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "4D",
      "5D",
      "6D",
      "7D",
      "8D",
      "9D",
      "+D",
      "/D"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 72,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "AE",
      "BE",
      "CE",
      "DE",
      "EE",
      "FE",
      "GE",
      "HE"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 73,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "IE",
      "JE",
      "KE",
      "LE",
      "ME",
      "NE",
      "OE",
      "PE"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD"
    ]
  },
  {
    "id": 90,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "QE",
      "RE",
      "SE",
      "TE",
      "UE",
      "VE",
      "WE",
      "XE",
      "YE",
      "ZE",
      "aE",
      "bE"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB"
    ]
  },
  {
    "id": 91,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "J",
    "base": [
      "cE",
      "dE",
      "eE",
      "fE",
      "gE",
      "hE",
      "iE",
      "jE",
      "kE",
      "lE",
      "mE",
      "nE"
    ],
    "glow": [
      "cB",
      "cB",
      "cB",
      "cB",
      "cB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "YB"
    ]
  },
  {
    "id": 92,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "pE",
      "qE",
      "rE",
      "sE",
      "tE",
      "uE",
      "vE",
      "wE",
      "xE",
      "yE",
      "zE",
      "0E"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "3D"
    ]
  },
  {
    "id": 95,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "1E",
      "2E",
      "rE",
      "sE",
      "tE",
      "uE",
      "3E",
      "4E",
      "5E",
      "6E",
      "7E",
      "8E"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E",
      "3D"
    ]
  },
  {
    "id": 100,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "+E",
      "/E",
      "SE",
      "TE",
      "UE",
      "VE",
      "iE",
      "jE",
      "kE",
      "lE",
      "AF",
      "BF"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "YB"
    ]
  },
  {
    "id": 103,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "CF",
      "DF",
      "EF",
      "FF",
      "GF",
      "HF",
      "IF",
      "JF"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "oE",
      "3D",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 105,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "V",
    "base": [
      "KF",
      "LF",
      "MF",
      "NF",
      "OF",
      "PF",
      "QF",
      "RF"
    ],
    "glow": [
      "SF",
      "SF",
      "SF",
      "SF",
      "SF",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D"
    ]
  },
  {
    "id": 110,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "TF",
      "UF",
      "VF",
      "WF",
      "XF",
      "YF",
      "ZF",
      "aF"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 52,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "bF",
      "cF",
      "dF",
      "eF",
      "fF",
      "gF",
      "hF",
      "iF"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 117,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "jF",
      "kF",
      "lF",
      "mF",
      "nF",
      "oF",
      "pF",
      "qF"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 120,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "W",
    "base": [
      "rF",
      "sF",
      "tF",
      "uF",
      "vF",
      "wF",
      "xF",
      "yF"
    ],
    "glow": [
      "9E",
      "9E",
      "9E",
      "9E",
      "9E",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D"
    ]
  },
  {
    "id": 121,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "zF",
      "0F",
      "1F",
      "2F",
      "3F",
      "4F",
      "5F",
      "6F"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 122,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "7F",
      "8F",
      "9F",
      "+F",
      "/F",
      "AG",
      "BG",
      "CG"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 311,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "DG",
      "EG",
      "FG",
      "GG",
      "HG",
      "IG",
      "JG",
      "KG"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 312,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "LG",
      "MG",
      "NG",
      "OG",
      "PG",
      "QG",
      "RG",
      "SG"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 313,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "TG",
      "UG",
      "VG",
      "WG",
      "XG",
      "YG",
      "ZG",
      "aG"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 62,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "bG",
      "cG",
      "dG",
      "eG",
      "fG",
      "gG",
      "hG",
      "iG"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "jG",
      "jG",
      "jG",
      "jG",
      "jG"
    ]
  },
  {
    "id": 63,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "kG",
      "lG",
      "mG",
      "nG",
      "oG",
      "pG",
      "qG",
      "rG"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "SF",
      "SF",
      "SF",
      "SF",
      "SF",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 129,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "sG",
      "tG",
      "uG",
      "vG",
      "wG",
      "xG",
      "yG",
      "zG"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "dD",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 132,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "0G",
      "1G",
      "2G",
      "3G",
      "4G",
      "5G",
      "6G",
      "7G"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "YB",
      "eD",
      "YB",
      "eD",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 69,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "8G",
      "9G",
      "+G",
      "/G",
      "AH",
      "BH",
      "CH",
      "DH"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 79,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "EH",
      "FH",
      "GH",
      "HH",
      "IH",
      "JH",
      "KH",
      "LH"
    ],
    "glow": [
      "dD",
      "dD",
      "3D",
      "dD",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "dD",
      "3D",
      "dD",
      "dD"
    ]
  },
  {
    "id": 93,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "MH",
      "NH",
      "OH",
      "PH",
      "QH",
      "RH",
      "SH",
      "TH"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "eD",
      "YB",
      "eD",
      "YB",
      "eD",
      "YB",
      "eD",
      "YB",
      "eD",
      "3D",
      "3D",
      "3D",
      "3D"
    ]
  },
  {
    "id": 86,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "UH",
      "VH",
      "WH",
      "XH",
      "YH",
      "ZH",
      "ZH",
      "aH"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 87,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "bH",
      "cH",
      "dH",
      "eH",
      "fH",
      "gH",
      "hH",
      "iH"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "dD",
      "YB",
      "YB"
    ]
  },
  {
    "id": 96,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "jH",
      "kH",
      "lH",
      "mH",
      "nH",
      "oH",
      "pH",
      "qH"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "dD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 97,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "rH",
      "sH",
      "tH",
      "uH",
      "vH",
      "oH",
      "pH",
      "qH"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "YB",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 98,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "wH",
      "xH",
      "yH",
      "zH",
      "0H",
      "4F",
      "5F",
      "6F"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 107,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "pE",
      "qE",
      "rE",
      "1H",
      "2H",
      "3H",
      "4H",
      "5H",
      "6H",
      "yE",
      "zE",
      "0E"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "dD",
      "3D",
      "3D",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 139,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "7H",
      "8H",
      "9H",
      "+H",
      "/H",
      "AI",
      "AI",
      "BI"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "3D",
      "3D",
      "YB",
      "3D",
      "3D",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 154,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "CI",
      "DI",
      "EI",
      "FI",
      "GI",
      "HI",
      "WB",
      "II"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "JI",
      "JI",
      "QB",
      "JI",
      "JI",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 148,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "KI",
      "LI",
      "MI",
      "NI",
      "OI",
      "hH",
      "hH",
      "PI"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 220,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Y",
    "base": [
      "QI",
      "RI",
      "SI",
      "TI",
      "UI",
      "VI",
      "WI",
      "XI"
    ],
    "glow": [
      "jG",
      "jG",
      "jG",
      "jG",
      "jG",
      "dD",
      "dD",
      "YB",
      "dD",
      "dD",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 127,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "YI",
      "ZI",
      "aI",
      "bI",
      "cI",
      "dI",
      "eI",
      "fI"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "cB",
      "cB",
      "cB",
      "cB",
      "cB"
    ]
  },
  {
    "id": 131,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "gI",
      "hI",
      "iI",
      "jI",
      "kI",
      "lI",
      "mI",
      "nI"
    ],
    "glow": [
      "YB",
      "YB",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "eD",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "YB",
      "YB"
    ]
  },
  {
    "id": 50,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "oI",
      "pI",
      "qI",
      "rI",
      "sI",
      "tI",
      "uI",
      "vI"
    ],
    "glow": [
      "eD",
      "eD",
      "YB",
      "eD",
      "eD",
      "YB",
      "eD",
      "eD",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD"
    ]
  },
  {
    "id": 75,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "wI",
      "xI",
      "yI",
      "zI",
      "0I",
      "1I",
      "2I",
      "3I",
      "4I",
      "5I",
      "6I",
      "7I"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB"
    ]
  },
  {
    "id": 135,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "8I",
      "9I",
      "+I",
      "/I",
      "AJ",
      "BJ",
      "CJ",
      "DJ"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 53,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "EJ",
      "FJ",
      "GJ",
      "HJ",
      "IJ",
      "JJ",
      "KJ",
      "LJ"
    ],
    "glow": [
      "dD",
      "dD",
      "YB",
      "dD",
      "dD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 112,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "MJ",
      "NJ",
      "OJ",
      "PJ",
      "QJ",
      "RJ",
      "SJ",
      "TJ"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB"
    ]
  },
  {
    "id": 137,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "UJ",
      "VJ",
      "WJ",
      "XJ",
      "YJ",
      "ZJ",
      "aJ",
      "bJ"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "cJ",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 113,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Y",
    "base": [
      "dJ",
      "eJ",
      "fJ",
      "gJ",
      "hJ",
      "iJ",
      "jJ",
      "kJ",
      "lJ",
      "mJ",
      "nJ",
      "oJ"
    ],
    "glow": [
      "jG",
      "jG",
      "jG",
      "jG",
      "jG",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "jG",
      "jG",
      "jG",
      "jG",
      "jG",
      "YB"
    ]
  },
  {
    "id": 134,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Z",
    "base": [
      "pJ",
      "qJ",
      "rJ",
      "sJ",
      "tJ",
      "uJ",
      "vJ",
      "wJ"
    ],
    "glow": [
      "xJ",
      "xJ",
      "xJ",
      "xJ",
      "xJ",
      "YB",
      "YB",
      "xJ",
      "YB",
      "YB",
      "xJ",
      "xJ",
      "xJ",
      "xJ",
      "xJ"
    ]
  },
  {
    "id": 74,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "yJ",
      "zJ",
      "0J",
      "1J",
      "2J",
      "3J",
      "4J",
      "5J"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "oE",
      "oE",
      "oE",
      "oE",
      "3D",
      "3D",
      "3D",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 106,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "+E",
      "/E",
      "SE",
      "TE",
      "6J",
      "7J",
      "8J",
      "9J",
      "+J",
      "lE",
      "AF",
      "BF"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "3D",
      "YB",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 149,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "/J",
      "AK",
      "BK",
      "CK",
      "DK",
      "ZJ",
      "aJ",
      "bJ"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "oE",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 151,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "EK",
      "FK",
      "GK",
      "HK",
      "IK",
      "JK",
      "KK",
      "LK"
    ],
    "glow": [
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 54,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "MK",
      "NK",
      "OK",
      "PK",
      "QK",
      "RK",
      "SK",
      "TK"
    ],
    "glow": [
      "eD",
      "eD",
      "YB",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 152,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "UK",
      "VK",
      "WK",
      "XK",
      "YK",
      "ZK",
      "aK",
      "bK"
    ],
    "glow": [
      "YB",
      "YB",
      "9E",
      "9E",
      "9E",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 221,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Y",
    "base": [
      "cK",
      "dK",
      "eK",
      "fK",
      "gK",
      "hK",
      "iK",
      "jK"
    ],
    "glow": [
      "jG",
      "jG",
      "jG",
      "jG",
      "jG",
      "YB",
      "YB",
      "3D",
      "YB",
      "YB",
      "jG",
      "jG",
      "jG",
      "jG",
      "jG"
    ]
  },
  {
    "id": 202,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "kK",
      "lK",
      "mK",
      "nK",
      "oK",
      "pK",
      "qK",
      "rK"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "dD",
      "3D",
      "3D",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 80,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "sK",
      "tK",
      "uK",
      "vK",
      "wK",
      "xK",
      "yK",
      "zK"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "oE",
      "3D",
      "3D",
      "3D",
      "0K",
      "0K",
      "3D",
      "3D",
      "3D",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 300,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "1K",
      "2K",
      "3K",
      "4K",
      "5K",
      "6K",
      "7K",
      "8K"
    ],
    "glow": [
      "eD",
      "YB",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 230,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "9K",
      "+K",
      "/K",
      "AL",
      "BL",
      "CL",
      "DL",
      "EL"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "eD",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 104,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "FL",
      "GL",
      "HL",
      "IL",
      "JL",
      "CL",
      "DL",
      "EL"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "eD",
      "jG",
      "eD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 119,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "KL",
      "LL",
      "ML",
      "NL",
      "OL",
      "PL",
      "QL",
      "RL"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "cJ",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 101,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "wI",
      "xI",
      "yI",
      "SL",
      "UE",
      "VE",
      "TL",
      "UL",
      "VL",
      "5I",
      "6I",
      "7I"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB"
    ]
  },
  {
    "id": 128,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "WL",
      "XL",
      "YL",
      "ZL",
      "aL",
      "bL",
      "cL",
      "dL"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "eD",
      "YB",
      "3D",
      "3D",
      "eD",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 203,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "eL",
      "fL",
      "gL",
      "hL",
      "iL",
      "jL",
      "kL",
      "lL"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "eD",
      "eD",
      "YB",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 301,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "mL",
      "nL",
      "oL",
      "pL",
      "qL",
      "rL",
      "sL",
      "tL"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "oE",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 58,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "uL",
      "vL",
      "wL",
      "xL",
      "yL",
      "zL",
      "0L",
      "1L"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 59,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "2L",
      "3L",
      "4L",
      "5L",
      "6L",
      "7L",
      "8L",
      "9L"
    ],
    "glow": [
      "QB",
      "QB",
      "QB",
      "QB",
      "QB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "SF",
      "SF",
      "SF",
      "SF",
      "SF"
    ]
  },
  {
    "id": 67,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "+L",
      "/L",
      "AM",
      "BM",
      "CM",
      "DM",
      "EM",
      "FM"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "oE",
      "oE",
      "oE",
      "oE",
      "YB",
      "YB",
      "YB",
      "YB",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 77,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "GM",
      "HM",
      "IM",
      "JM",
      "KM",
      "LM",
      "MM",
      "NM"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "OM",
      "YB",
      "OM",
      "YB",
      "OM",
      "OM",
      "OM",
      "OM",
      "OM",
      "OM"
    ]
  },
  {
    "id": 78,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "PM",
      "QM",
      "RM",
      "SM",
      "TM",
      "UM",
      "VM",
      "WM"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 89,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "XM",
      "YM",
      "ZM",
      "aM",
      "bM",
      "cM",
      "dM",
      "eM"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "YB",
      "9E",
      "9E",
      "3D",
      "oE",
      "oE",
      "oE",
      "3D",
      "eD",
      "eD",
      "eD",
      "YB"
    ]
  },
  {
    "id": 307,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "fM",
      "gM",
      "hM",
      "iM",
      "jM",
      "hH",
      "hH",
      "hH"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "YB"
    ]
  },
  {
    "id": 309,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "kM",
      "lM",
      "mM",
      "nM",
      "oM",
      "aK",
      "aK",
      "aK"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "oE",
      "dD",
      "oE"
    ]
  },
  {
    "id": 99,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "pM",
      "qM",
      "rM",
      "sM",
      "tM",
      "zL",
      "0L",
      "1L"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "3D",
      "YB",
      "YB",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 102,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "uM",
      "vM",
      "wM",
      "xM",
      "yM",
      "zL",
      "0L",
      "1L"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "oE",
      "oE",
      "YB",
      "YB",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 108,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "zM",
      "0M",
      "1M",
      "2M",
      "3M",
      "4M",
      "5M",
      "6M"
    ],
    "glow": [
      "dD",
      "YB",
      "dD",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 109,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "7M",
      "8M",
      "9M",
      "+M",
      "/M",
      "AN",
      "BN",
      "CN"
    ],
    "glow": [
      "oE",
      "oE",
      "YB",
      "YB",
      "oE",
      "oE"
    ]
  },
  {
    "id": 114,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "DN",
      "EN",
      "FN",
      "GN",
      "HN",
      "IN",
      "JN",
      "KN"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "LN",
      "LN",
      "LN",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 133,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "W",
    "base": [
      "MN",
      "NN",
      "ON",
      "PN",
      "QN",
      "RN",
      "SN",
      "TN"
    ],
    "glow": [
      "9E",
      "9E",
      "9E",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 136,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "UN",
      "VN",
      "WN",
      "XN",
      "YN",
      "ZN",
      "aN",
      "bN"
    ],
    "glow": [
      "dD",
      "YB",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 138,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "cN",
      "dN",
      "eN",
      "fN",
      "gN",
      "hN",
      "iN",
      "jN"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "9E",
      "9E",
      "9E",
      "9E",
      "YB",
      "9E",
      "9E",
      "9E",
      "9E",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 153,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "W",
    "base": [
      "kN",
      "lN",
      "mN",
      "nN",
      "oN",
      "pN",
      "qN",
      "rN"
    ],
    "glow": [
      "9E",
      "9E",
      "9E",
      "9E",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "dD"
    ]
  },
  {
    "id": 155,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "sN",
      "vL",
      "tN",
      "uN",
      "vN",
      "wN",
      "xN",
      "yN"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "9E",
      "9E",
      "9E",
      "9E",
      "9E"
    ]
  },
  {
    "id": 156,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "zN",
      "0N",
      "1N",
      "2N",
      "3N",
      "4N",
      "5N",
      "6N",
      "7N",
      "8N",
      "9N",
      "+N"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "cB",
      "cB",
      "cB",
      "cB",
      "cB",
      "YB"
    ]
  },
  {
    "id": 56,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "/N",
      "AO",
      "BO",
      "CO",
      "DO",
      "EO",
      "FO",
      "GO"
    ],
    "glow": [
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "YB",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 61,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "HO",
      "IO",
      "JO",
      "KO",
      "LO",
      "MO",
      "NO",
      "OO"
    ],
    "glow": [
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "YB",
      "eD",
      "eD",
      "eD",
      "dD",
      "YB",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 157,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Y",
    "base": [
      "PO",
      "QO",
      "RO",
      "SO",
      "TO",
      "UO",
      "UO",
      "VO"
    ],
    "glow": [
      "jG",
      "jG",
      "jG",
      "jG",
      "jG",
      "YB",
      "jG",
      "YB",
      "jG",
      "YB",
      "jG",
      "YB"
    ]
  },
  {
    "id": 55,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "WO",
      "XO",
      "YO",
      "ZO",
      "aO",
      "bO",
      "hH",
      "cO"
    ],
    "glow": [
      "3D",
      "3D",
      "dD",
      "dD",
      "dD",
      "3D",
      "3D",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 88,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "dO",
      "eO",
      "fO",
      "gO",
      "hO",
      "hH",
      "hH",
      "hH"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 82,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "iO",
      "jO",
      "kO",
      "lO",
      "mO",
      "nO",
      "hH",
      "oO"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 150,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "pO",
      "qO",
      "rO",
      "sO",
      "tO",
      "uO",
      "vO",
      "wO",
      "xO",
      "yO",
      "zO",
      "0O"
    ],
    "glow": [
      "dD",
      "dD",
      "3D",
      "dD",
      "dD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "eD"
    ]
  },
  {
    "id": 94,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "1O",
      "2O",
      "3O",
      "4O",
      "5O",
      "hH",
      "hH",
      "hH"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "YB",
      "YB"
    ]
  },
  {
    "id": 308,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "6O",
      "7O",
      "8O",
      "9O",
      "+O",
      "/O",
      "AP",
      "BP"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "oE",
      "YB",
      "YB",
      "oE",
      "YB",
      "YB",
      "oE",
      "YB",
      "oE"
    ]
  },
  {
    "id": 303,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "CP",
      "DP",
      "EP",
      "FP",
      "GP",
      "HP",
      "IP",
      "JP"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 305,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "KP",
      "LP",
      "MP",
      "NP",
      "OP",
      "PP",
      "QP",
      "RP"
    ],
    "glow": [
      "eD",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "eD",
      "eD",
      "eD",
      "eD"
    ]
  },
  {
    "id": 126,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "J",
    "base": [
      "SP",
      "TP",
      "UP",
      "VP",
      "WP",
      "XP",
      "YP",
      "ZP"
    ],
    "glow": [
      "cB",
      "cB",
      "cB",
      "cB",
      "cB",
      "YB",
      "YB",
      "aP",
      "YB",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE"
    ]
  },
  {
    "id": 124,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "bP",
      "cP",
      "dP",
      "eP",
      "fP",
      "gP",
      "hP",
      "iP"
    ],
    "glow": [
      "3D",
      "3D",
      "jP",
      "jP",
      "3D",
      "jP",
      "jP",
      "3D",
      "3D",
      "kP",
      "kP",
      "lP",
      "lP"
    ]
  },
  {
    "id": 68,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "mP",
      "nP",
      "oP",
      "pP",
      "qP",
      "rP",
      "sP",
      "tP"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "oE",
      "oE",
      "YB",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 314,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "X",
    "base": [
      "uP",
      "vP",
      "wP",
      "xP",
      "yP",
      "YG",
      "ZG",
      "zP"
    ],
    "glow": [
      "3D",
      "3D",
      "3D",
      "3D",
      "3D",
      "oE",
      "oE",
      "YB",
      "oE",
      "oE",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 81,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Y",
    "base": [
      "0P",
      "1P",
      "2P",
      "3P",
      "4P",
      "5P",
      "6P",
      "7P"
    ],
    "glow": [
      "jG",
      "jG",
      "8P",
      "8P",
      "8P",
      "8P",
      "jG",
      "jG",
      "jG",
      "jG",
      "8P",
      "8P",
      "jG",
      "jG",
      "jG"
    ]
  },
  {
    "id": 306,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "Y",
    "base": [
      "9P",
      "+P",
      "/P",
      "AQ",
      "BQ",
      "CQ",
      "DQ",
      "EQ"
    ],
    "glow": [
      "jG",
      "jG",
      "jG",
      "jG",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "QB",
      "QB",
      "QB",
      "QB",
      "YB"
    ]
  },
  {
    "id": 310,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "FQ",
      "GQ",
      "HQ",
      "IQ",
      "JQ",
      "hH",
      "hH",
      "KQ"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "3D",
      "dD",
      "3D",
      "3D",
      "3D",
      "dD",
      "3D",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 130,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "LQ",
      "MQ",
      "NQ",
      "OQ",
      "PQ",
      "QQ",
      "RQ",
      "SQ"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 76,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "TQ",
      "UQ",
      "VQ",
      "WQ",
      "XQ",
      "YQ",
      "ZQ",
      "aQ"
    ],
    "glow": [
      "eD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "dD",
      "eD"
    ]
  },
  {
    "id": 84,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "bQ",
      "cQ",
      "dQ",
      "eQ",
      "fQ",
      "gQ",
      "hQ",
      "iQ"
    ],
    "glow": [
      "YB",
      "YB",
      "9E",
      "YB",
      "9E",
      "YB",
      "9E",
      "YB",
      "YB",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 85,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "jQ",
      "kQ",
      "lQ",
      "mQ",
      "nQ",
      "WB",
      "WB",
      "WB"
    ],
    "glow": [
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 302,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "U",
    "base": [
      "oQ",
      "pQ",
      "qQ",
      "rQ",
      "sQ",
      "tQ",
      "BN",
      "uQ"
    ],
    "glow": [
      "oE",
      "oE",
      "oE",
      "oE",
      "oE",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 115,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "vQ",
      "wQ",
      "xQ",
      "yQ",
      "zQ",
      "gF",
      "hF",
      "iF"
    ],
    "glow": [
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 118,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "0Q",
      "1Q",
      "2Q",
      "3Q",
      "4Q",
      "5Q",
      "6Q",
      "7Q"
    ],
    "glow": [
      "YB",
      "3D",
      "YB",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "eD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD",
      "dD"
    ]
  },
  {
    "id": 83,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "S",
    "base": [
      "8Q",
      "9Q",
      "+Q",
      "/Q",
      "AR",
      "BR",
      "CR",
      "DR"
    ],
    "glow": [
      "eD",
      "eD",
      "3D",
      "eD",
      "eD",
      "3D",
      "eD",
      "eD",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD",
      "YB",
      "dD"
    ]
  },
  {
    "id": 116,
    "groupId": "sg3",
    "groupLabel": "Flags",
    "guest": false,
    "nonbuyable": false,
    "prime": "T",
    "base": [
      "ER",
      "FR",
      "GR",
      "HR",
      "IR",
      "JR",
      "KR",
      "LR"
    ],
    "glow": [
      "dD",
      "dD",
      "YB",
      "dD",
      "dD",
      "YB",
      "YB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 140,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "P",
    "base": [
      "MR",
      "NR",
      "OR",
      "PR",
      "QR",
      "RR",
      "SR",
      "TR"
    ],
    "glow": [
      "7C",
      "7C",
      "7C",
      "XB",
      "OB",
      "OB",
      "OB",
      "XB"
    ]
  },
  {
    "id": 141,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "P",
    "base": [
      "UR",
      "VR",
      "WR",
      "XR"
    ],
    "glow": [
      "7C",
      "7C",
      "YB",
      "YB"
    ]
  },
  {
    "id": 142,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "F",
    "base": [
      "YR",
      "ZR",
      "aR",
      "bR",
      "cR",
      "dR",
      "eR",
      "fR"
    ],
    "glow": [
      "QB",
      "QB",
      "OB",
      "OB",
      "QB",
      "QB",
      "OB"
    ]
  },
  {
    "id": 143,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "J",
    "base": [
      "gR",
      "hR",
      "iR",
      "jR",
      "kR",
      "lR",
      "mR"
    ],
    "glow": [
      "cB",
      "cB",
      "OB",
      "OB",
      "cB",
      "cB",
      "MB"
    ]
  },
  {
    "id": 144,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "K",
    "base": [
      "nR",
      "oR",
      "pR",
      "qR",
      "rR",
      "sR"
    ],
    "glow": [
      "3B",
      "3B",
      "XB",
      "XB",
      "SB",
      "SB"
    ]
  },
  {
    "id": 145,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "C",
    "base": [
      "tR",
      "uR",
      "vR",
      "wR",
      "xR",
      "yR"
    ],
    "glow": [
      "KB",
      "KB",
      "cB",
      "cB",
      "OB",
      "OB"
    ]
  },
  {
    "id": 146,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "P",
    "base": [
      "zR",
      "0R",
      "1R",
      "2R",
      "3R",
      "4R",
      "5R"
    ],
    "glow": [
      "7C",
      "7C",
      "QB",
      "QB",
      "ZC",
      "ZC"
    ]
  },
  {
    "id": 147,
    "groupId": "sg4",
    "groupLabel": "Abstraction",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "6R",
      "7R",
      "8R",
      "9R",
      "+R",
      "/R",
      "AS"
    ],
    "glow": [
      "YB",
      "XB",
      "YB",
      "MB",
      "YB",
      "OB",
      "YB"
    ]
  },
  {
    "id": 160,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "E",
    "base": [
      "BS",
      "CS",
      "DS",
      "ES",
      "FS",
      "GS",
      "HS"
    ],
    "glow": [
      "OB",
      "MB",
      "MB",
      "OB",
      "MB",
      "MB",
      "OB"
    ]
  },
  {
    "id": 161,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "N",
    "base": [
      "IS",
      "JS",
      "KS",
      "LS",
      "MS",
      "NS",
      "OS"
    ],
    "glow": [
      "eB",
      "aB",
      "aB",
      "eB",
      "OB",
      "OB",
      "eB"
    ]
  },
  {
    "id": 162,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "a",
    "base": [
      "PS",
      "QS",
      "RS",
      "SS",
      "TS"
    ],
    "glow": [
      "UB",
      "OB",
      "UB",
      "eB",
      "UB"
    ]
  },
  {
    "id": 163,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "H",
    "base": [
      "US",
      "VS",
      "WS",
      "XS",
      "YS"
    ],
    "glow": [
      "XB",
      "OB",
      "XB",
      "eB",
      "XB"
    ]
  },
  {
    "id": 164,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "K",
    "base": [
      "ZS",
      "aS",
      "bS",
      "cS",
      "dS",
      "eS",
      "fS",
      "gS"
    ],
    "glow": [
      "3B",
      "UB",
      "3B",
      "3B",
      "3B",
      "OB",
      "3B",
      "3B"
    ]
  },
  {
    "id": 165,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "M",
    "base": [
      "hS",
      "iS",
      "jS",
      "kS",
      "lS",
      "mS",
      "nS",
      "oS"
    ],
    "glow": [
      "ZC",
      "UB",
      "ZC",
      "ZC",
      "ZC",
      "OB",
      "ZC",
      "ZC"
    ]
  },
  {
    "id": 166,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "M",
    "base": [
      "pS",
      "qS",
      "rS",
      "sS",
      "tS",
      "uS",
      "vS"
    ],
    "glow": [
      "ZC",
      "aB",
      "eB",
      "ZC",
      "aB",
      "eB",
      "ZC"
    ]
  },
  {
    "id": 167,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "wS",
      "xS",
      "yS",
      "zS",
      "0S",
      "1S",
      "2S"
    ],
    "glow": [
      "SB",
      "QB",
      "aB",
      "SB",
      "QB",
      "aB",
      "SB"
    ]
  },
  {
    "id": 168,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "b",
    "base": [
      "3S",
      "4S",
      "5S",
      "6S",
      "7S",
      "8S"
    ],
    "glow": [
      "GC",
      "SB",
      "SB",
      "QB",
      "GC",
      "GC"
    ]
  },
  {
    "id": 169,
    "groupId": "sg5",
    "groupLabel": "Treats",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "9S",
      "+S",
      "/S",
      "AT",
      "BT",
      "CT"
    ],
    "glow": [
      "SB",
      "aB",
      "OB",
      "OB",
      "SB",
      "SB"
    ]
  },
  {
    "id": 170,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "DT",
      "ET",
      "FT",
      "GT",
      "HT",
      "IT",
      "JT",
      "KT",
      "LT",
      "MT"
    ],
    "glow": [
      "SB",
      "SB",
      "SB",
      "UB",
      "SB",
      "SB",
      "SB",
      "OB"
    ]
  },
  {
    "id": 171,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "P",
    "base": [
      "NT",
      "OT",
      "PT",
      "QT",
      "RT",
      "ST",
      "TT"
    ],
    "glow": [
      "7C",
      "QB",
      "QB",
      "OB",
      "QB"
    ]
  },
  {
    "id": 172,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "R",
    "base": [
      "UT",
      "VT",
      "WT",
      "XT",
      "YT",
      "ZT",
      "aT",
      "bT",
      "cT",
      "dT"
    ],
    "glow": [
      "YB",
      "YB",
      "OB",
      "YB",
      "YB",
      "GC",
      "YB",
      "YB",
      "QB"
    ]
  },
  {
    "id": 173,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "eT",
      "fT",
      "gT",
      "hT",
      "iT",
      "jT",
      "kT",
      "lT",
      "mT",
      "nT"
    ],
    "glow": [
      "SB",
      "SB",
      "GC",
      "SB",
      "SB",
      "YB",
      "YB",
      "YB"
    ]
  },
  {
    "id": 174,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "oT",
      "pT",
      "qT",
      "rT",
      "sT",
      "tT",
      "uT",
      "vT",
      "wT",
      "xT",
      "yT"
    ],
    "glow": [
      "qC",
      "qC",
      "YB",
      "3B",
      "qC",
      "qC",
      "cB",
      "MB"
    ]
  },
  {
    "id": 175,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "E",
    "base": [
      "zT",
      "0T",
      "1T",
      "2T",
      "3T",
      "4T",
      "5T",
      "6T",
      "7T",
      "8T",
      "9T"
    ],
    "glow": [
      "OB",
      "OB",
      "QB",
      "OB",
      "OB",
      "UB"
    ]
  },
  {
    "id": 176,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "+T",
      "/T",
      "AU",
      "BU",
      "CU",
      "DU",
      "EU",
      "FU",
      "GU",
      "HU",
      "IU"
    ],
    "glow": [
      "qC",
      "qC",
      "OB",
      "qC",
      "qC",
      "eB"
    ]
  },
  {
    "id": 9251,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "a",
    "base": [
      "JU",
      "KU",
      "LU",
      "MU",
      "NU",
      "OU",
      "PU",
      "QU",
      "RU",
      "SU",
      "TU",
      "UU",
      "VU",
      "WU",
      "XU"
    ],
    "glow": [
      "UB",
      "UB",
      "3B",
      "UB",
      "OB",
      "OB",
      "UB",
      "cB",
      "UB",
      "UB",
      "UB",
      "3B",
      "UB",
      "7C",
      "7C",
      "UB",
      "cB",
      "UB"
    ]
  },
  {
    "id": 9252,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "YU",
      "ZU",
      "aU",
      "bU",
      "cU",
      "dU",
      "eU",
      "fU",
      "gU",
      "hU",
      "iU",
      "jU",
      "kU",
      "lU",
      "mU",
      "nU",
      "oU",
      "pU",
      "qU",
      "rU",
      "sU"
    ],
    "glow": [
      "SB",
      "SB",
      "QB",
      "SB",
      "GC",
      "OB",
      "SB"
    ]
  },
  {
    "id": 9253,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "G",
    "base": [
      "tU",
      "uU",
      "vU",
      "wU",
      "xU",
      "yU",
      "zU",
      "0U",
      "1U",
      "2U",
      "3U",
      "4U"
    ],
    "glow": [
      "SB",
      "SB",
      "SB",
      "OB",
      "MB",
      "SB",
      "SB",
      "SB",
      "ED",
      "MB",
      "SB",
      "SB",
      "SB",
      "qC",
      "MB"
    ]
  },
  {
    "id": 9254,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "5U",
      "6U",
      "7U",
      "8U",
      "9U",
      "+U",
      "/U",
      "AV",
      "BV",
      "CV"
    ],
    "glow": [
      "qC",
      "qC",
      "qC",
      "qC",
      "QB",
      "ED",
      "ZC"
    ]
  },
  {
    "id": 9255,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "DV",
      "EV",
      "FV",
      "GV",
      "HV",
      "IV",
      "JV",
      "KV",
      "LV",
      "MV",
      "NV",
      "OV",
      "PV",
      "QV",
      "RV",
      "SV",
      "TV",
      "UV",
      "VV",
      "WV"
    ],
    "glow": [
      "qC",
      "qC",
      "qC",
      "XB",
      "ED",
      "XB",
      "qC",
      "qC",
      "qC",
      "cB",
      "GC",
      "cB"
    ]
  },
  {
    "id": 9256,
    "groupId": "sg6",
    "groupLabel": "Spring",
    "guest": false,
    "nonbuyable": false,
    "prime": "b",
    "base": [
      "XV",
      "YV",
      "ZV",
      "aV",
      "bV",
      "cV",
      "dV",
      "eV",
      "fV",
      "gV"
    ],
    "glow": [
      "GC",
      "GC",
      "GC",
      "QB",
      "GC",
      "GC",
      "GC",
      "OB",
      "qC",
      "OB",
      "qC",
      "OB"
    ]
  },
  {
    "id": 180,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "hV",
      "iV",
      "jV",
      "kV",
      "lV",
      "mV",
      "nV",
      "oV"
    ],
    "glow": [
      "qC",
      "qC",
      "ZC",
      "ZC",
      "qC",
      "qC",
      "eB",
      "eB"
    ]
  },
  {
    "id": 181,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "pV",
      "qV",
      "rV",
      "sV",
      "tV",
      "uV",
      "vV",
      "wV",
      "xV"
    ],
    "glow": [
      "qC",
      "3B",
      "qC",
      "ZC",
      "qC",
      "QB"
    ]
  },
  {
    "id": 182,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "yV",
      "zV",
      "0V",
      "1V",
      "2V",
      "3V",
      "4V",
      "5V",
      "6V",
      "7V"
    ],
    "glow": [
      "qC",
      "SB",
      "OB",
      "cB",
      "qC"
    ]
  },
  {
    "id": 183,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "8V",
      "9V",
      "+V",
      "/V",
      "AW",
      "BW",
      "CW",
      "DW",
      "EW",
      "FW",
      "GW"
    ],
    "glow": [
      "qC",
      "7C",
      "qC",
      "aB",
      "qC"
    ]
  },
  {
    "id": 184,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "HW",
      "IW",
      "JW",
      "KW",
      "LW",
      "MW",
      "NW",
      "OW",
      "PW",
      "QW",
      "RW"
    ],
    "glow": [
      "qC",
      "GC",
      "qC",
      "OB",
      "qC",
      "QB",
      "qC",
      "3B",
      "qC",
      "aB"
    ]
  },
  {
    "id": 185,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "SW",
      "TW",
      "UW",
      "VW",
      "WW",
      "XW",
      "YW",
      "ZW",
      "aW",
      "bW",
      "cW"
    ],
    "glow": [
      "qC",
      "QB",
      "qC",
      "XB",
      "qC",
      "aB",
      "qC",
      "SB"
    ]
  },
  {
    "id": 186,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "dW",
      "eW",
      "fW",
      "gW",
      "hW",
      "iW",
      "jW",
      "kW",
      "lW",
      "mW",
      "nW"
    ],
    "glow": [
      "qC",
      "OB",
      "qC",
      "OB",
      "qC",
      "3B"
    ]
  },
  {
    "id": 187,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "oW",
      "pW",
      "qW",
      "rW",
      "sW",
      "tW",
      "uW",
      "vW",
      "wW",
      "xW",
      "yW"
    ],
    "glow": [
      "qC",
      "cB",
      "cB",
      "qC",
      "3B",
      "eB"
    ]
  },
  {
    "id": 188,
    "groupId": "sg7",
    "groupLabel": "Space",
    "guest": false,
    "nonbuyable": false,
    "prime": "Q",
    "base": [
      "zW",
      "0W",
      "1W",
      "2W",
      "3W",
      "4W",
      "5W",
      "6W",
      "7W",
      "8W"
    ],
    "glow": [
      "qC",
      "qC",
      "qC",
      "OB",
      "cB",
      "OB"
    ]
  },
  {
    "id": 9400,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "c",
    "base": [
      "9W",
      "+W",
      "/W",
      "AX",
      "BX",
      "CX",
      "DX",
      "EX",
      "FX",
      "GX",
      "HX",
      "IX",
      "JX",
      "KX",
      "LX",
      "MX",
      "NX",
      "OX",
      "PX",
      "QX",
      "RX",
      "SX",
      "TX",
      "UX",
      "VX",
      "WX",
      "XX"
    ],
    "glow": [
      "YX",
      "YX",
      "YX",
      "ZX",
      "ZX",
      "ZX",
      "aX",
      "aX",
      "aX",
      "ZX",
      "ZX",
      "ZX",
      "aX",
      "aX",
      "aX"
    ]
  },
  {
    "id": 9401,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "d",
    "base": [
      "bX",
      "cX",
      "dX",
      "eX",
      "fX",
      "gX",
      "hX",
      "iX",
      "jX",
      "kX",
      "lX",
      "mX",
      "nX",
      "oX"
    ],
    "glow": [
      "pX",
      "pX",
      "qX",
      "pX",
      "rX",
      "pX",
      "pX",
      "sX",
      "sX",
      "tX",
      "tX",
      "3B",
      "tX",
      "uX",
      "tX",
      "tX",
      "sX",
      "sX"
    ]
  },
  {
    "id": 9402,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "e",
    "base": [
      "vX",
      "wX",
      "xX",
      "yX",
      "zX",
      "0X",
      "1X",
      "2X",
      "3X",
      "4X",
      "5X",
      "6X",
      "7X",
      "8X",
      "9X",
      "+X",
      "/X",
      "AY",
      "BY",
      "CY",
      "DY",
      "EY",
      "FY",
      "GY",
      "HY"
    ],
    "glow": [
      "IY",
      "IY",
      "IY",
      "IY",
      "tX",
      "tX",
      "JY",
      "JY",
      "tX",
      "tX",
      "uX",
      "uX",
      "tX",
      "tX",
      "IY",
      "IY",
      "IY",
      "IY",
      "KY",
      "KY",
      "qX",
      "qX",
      "KY",
      "KY",
      "LY",
      "LY",
      "KY",
      "KY"
    ]
  },
  {
    "id": 9403,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "f",
    "base": [
      "MY",
      "NY",
      "OY",
      "PY",
      "QY",
      "RY",
      "SY",
      "TY",
      "UY",
      "VY",
      "WY",
      "XY",
      "YY",
      "ZY",
      "aY",
      "bY",
      "cY",
      "dY",
      "eY",
      "fY",
      "gY",
      "hY"
    ],
    "glow": [
      "iY",
      "iY",
      "cB",
      "iY",
      "iY",
      "jY",
      "iY",
      "iY",
      "YB",
      "kY",
      "kY",
      "YB",
      "lY",
      "lY",
      "3B",
      "lY",
      "lY",
      "qX",
      "lY",
      "lY",
      "YB",
      "kY",
      "kY",
      "YB"
    ]
  },
  {
    "id": 9404,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "g",
    "base": [
      "mY",
      "nY",
      "oY",
      "pY",
      "qY",
      "rY",
      "sY",
      "tY",
      "uY",
      "vY",
      "wY",
      "xY",
      "yY",
      "zY",
      "0Y",
      "1Y",
      "2Y",
      "3Y",
      "4Y",
      "5Y",
      "6Y",
      "7Y",
      "8Y"
    ],
    "glow": [
      "9Y",
      "9Y",
      "+Y",
      "/Y",
      "9Y",
      "9Y",
      "YB",
      "AZ",
      "BZ",
      "AZ",
      "YB",
      "uX",
      "uX",
      "kY",
      "CZ",
      "uX",
      "uX",
      "YB",
      "AZ",
      "BZ",
      "AZ",
      "YB"
    ]
  },
  {
    "id": 9405,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "h",
    "base": [
      "DZ",
      "EZ",
      "FZ",
      "GZ",
      "HZ",
      "IZ",
      "JZ",
      "KZ",
      "LZ",
      "MZ",
      "NZ",
      "OZ",
      "PZ",
      "QZ",
      "RZ",
      "SZ",
      "TZ",
      "UZ",
      "VZ",
      "WZ",
      "XZ",
      "YZ",
      "ZZ",
      "aZ",
      "bZ",
      "cZ"
    ],
    "glow": [
      "dZ",
      "dZ",
      "dZ",
      "tX",
      "tX",
      "eZ",
      "iY",
      "iY",
      "iY",
      "lY",
      "lY",
      "uX",
      "qX",
      "qX",
      "qX",
      "fZ",
      "fZ",
      "tX",
      "iY",
      "iY",
      "iY",
      "lY",
      "lY",
      "gZ"
    ]
  },
  {
    "id": 9406,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "i",
    "base": [
      "hZ",
      "iZ",
      "jZ",
      "kZ",
      "lZ",
      "mZ",
      "nZ",
      "oZ",
      "pZ",
      "qZ",
      "rZ",
      "sZ",
      "tZ",
      "uZ",
      "vZ",
      "wZ"
    ],
    "glow": [
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "dZ",
      "dZ",
      "yZ",
      "yZ",
      "dZ",
      "dZ",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "zZ",
      "zZ",
      "yZ",
      "yZ",
      "zZ",
      "zZ",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "0Z",
      "0Z",
      "yZ",
      "yZ",
      "0Z",
      "0Z",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "xZ",
      "1Z",
      "1Z",
      "yZ",
      "yZ",
      "1Z",
      "1Z"
    ]
  },
  {
    "id": 9407,
    "groupId": "sg8",
    "groupLabel": "Season of Love",
    "guest": false,
    "nonbuyable": true,
    "prime": "j",
    "base": [
      "2Z",
      "3Z",
      "4Z",
      "5Z",
      "6Z",
      "7Z",
      "8Z",
      "9Z",
      "+Z",
      "/Z",
      "Aa",
      "Ba",
      "Ca",
      "Da",
      "Ea",
      "Fa",
      "Ga",
      "Ha",
      "Ia",
      "Ja",
      "Ka",
      "La",
      "Ma"
    ],
    "glow": [
      "Na",
      "Na",
      "Na",
      "Na",
      "Oa",
      "Oa",
      "Pa",
      "Qa",
      "Ra",
      "Sa",
      "Ta",
      "Ua",
      "Oa",
      "Oa"
    ]
  }
] as const;

export const WORMATE_PARENT_EYES = [
  {
    "id": 0,
    "guest": true,
    "nonbuyable": false,
    "base": [
      "Va"
    ]
  },
  {
    "id": 1,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Wa"
    ]
  },
  {
    "id": 2,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Xa"
    ]
  },
  {
    "id": 3,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Ya"
    ]
  },
  {
    "id": 4,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Za"
    ]
  },
  {
    "id": 5,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "aa"
    ]
  },
  {
    "id": 7,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "ca"
    ]
  },
  {
    "id": 8,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "da"
    ]
  },
  {
    "id": 9,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "ea"
    ]
  },
  {
    "id": 10,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ba"
    ]
  },
  {
    "id": 11,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "fa"
    ]
  },
  {
    "id": 9036,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ga"
    ]
  },
  {
    "id": 9037,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ha"
    ]
  },
  {
    "id": 9038,
    "guest": false,
    "nonbuyable": false,
    "prime": "n",
    "base": [
      "ia"
    ]
  },
  {
    "id": 9039,
    "guest": false,
    "nonbuyable": false,
    "prime": "o",
    "base": [
      "ja"
    ]
  },
  {
    "id": 9087,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "ka"
    ]
  },
  {
    "id": 9088,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "la"
    ]
  },
  {
    "id": 9089,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "ma"
    ]
  },
  {
    "id": 9090,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "na"
    ]
  },
  {
    "id": 9091,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "oa"
    ]
  }
] as const;
export const WORMATE_PARENT_MOUTHS = [
  {
    "id": 0,
    "guest": true,
    "nonbuyable": false,
    "base": [
      "pa"
    ]
  },
  {
    "id": 1,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "qa"
    ]
  },
  {
    "id": 2,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ra"
    ]
  },
  {
    "id": 3,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "sa"
    ]
  },
  {
    "id": 4,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ta"
    ]
  },
  {
    "id": 5,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ua"
    ]
  },
  {
    "id": 6,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "va"
    ]
  },
  {
    "id": 7,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "wa"
    ]
  },
  {
    "id": 10,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wa",
      "2a"
    ]
  },
  {
    "id": 11,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "wa",
      "3a"
    ]
  },
  {
    "id": 12,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "wa",
      "4a"
    ]
  },
  {
    "id": 13,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "wa",
      "5a"
    ]
  },
  {
    "id": 14,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "wa",
      "6a"
    ]
  },
  {
    "id": 15,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "wa",
      "7a"
    ]
  },
  {
    "id": 16,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "wa",
      "8a"
    ]
  },
  {
    "id": 20,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wa",
      "9a"
    ]
  },
  {
    "id": 21,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "wa",
      "+a"
    ]
  },
  {
    "id": 22,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "wa",
      "/a"
    ]
  },
  {
    "id": 23,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "wa",
      "Ab"
    ]
  },
  {
    "id": 24,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "wa",
      "Bb"
    ]
  },
  {
    "id": 25,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "wa",
      "Cb"
    ]
  },
  {
    "id": 26,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "wa",
      "Db"
    ]
  },
  {
    "id": 30,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wa",
      "Eb"
    ]
  },
  {
    "id": 31,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "wa",
      "Fb"
    ]
  },
  {
    "id": 32,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "wa",
      "Gb"
    ]
  },
  {
    "id": 33,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "wa",
      "Hb"
    ]
  },
  {
    "id": 34,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "wa",
      "Ib"
    ]
  },
  {
    "id": 35,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "wa",
      "Jb"
    ]
  },
  {
    "id": 36,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "wa",
      "Kb"
    ]
  },
  {
    "id": 40,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wa",
      "Lb"
    ]
  },
  {
    "id": 41,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "wa",
      "Mb"
    ]
  },
  {
    "id": 42,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "wa",
      "Nb"
    ]
  },
  {
    "id": 43,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "wa",
      "Ob"
    ]
  },
  {
    "id": 44,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "wa",
      "Pb"
    ]
  },
  {
    "id": 45,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "wa",
      "Qb"
    ]
  },
  {
    "id": 46,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "wa",
      "Rb"
    ]
  },
  {
    "id": 50,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "Sb",
      "Tb"
    ]
  },
  {
    "id": 51,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "Sb",
      "Ub"
    ]
  },
  {
    "id": 52,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "Sb",
      "Vb"
    ]
  },
  {
    "id": 53,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "Sb",
      "Wb"
    ]
  },
  {
    "id": 54,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "Sb",
      "Xb"
    ]
  },
  {
    "id": 55,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "Sb",
      "Yb"
    ]
  },
  {
    "id": 56,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "Sb",
      "Zb"
    ]
  },
  {
    "id": 60,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "ab",
      "bb",
      "cb"
    ]
  },
  {
    "id": 61,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "ab",
      "db",
      "eb"
    ]
  },
  {
    "id": 62,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "ab",
      "fb",
      "gb"
    ]
  },
  {
    "id": 63,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "ab",
      "hb",
      "ib"
    ]
  },
  {
    "id": 64,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "ab",
      "jb",
      "kb"
    ]
  },
  {
    "id": 65,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "ab",
      "lb",
      "mb"
    ]
  },
  {
    "id": 66,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "ab",
      "nb",
      "ob"
    ]
  },
  {
    "id": 70,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wa",
      "pb"
    ]
  },
  {
    "id": 71,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "wa",
      "qb"
    ]
  },
  {
    "id": 72,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "wa",
      "rb"
    ]
  },
  {
    "id": 73,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "wa",
      "sb"
    ]
  },
  {
    "id": 74,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "wa",
      "tb"
    ]
  },
  {
    "id": 75,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "wa",
      "ub"
    ]
  },
  {
    "id": 76,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "wa",
      "vb"
    ]
  },
  {
    "id": 80,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wb",
      "xb",
      "yb"
    ]
  },
  {
    "id": 81,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "zb",
      "0b",
      "yb"
    ]
  },
  {
    "id": 82,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "1b",
      "2b",
      "yb"
    ]
  },
  {
    "id": 83,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "3b",
      "4b",
      "yb"
    ]
  },
  {
    "id": 84,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "5b",
      "6b",
      "yb"
    ]
  },
  {
    "id": 85,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "7b",
      "8b",
      "yb"
    ]
  },
  {
    "id": 86,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "9b",
      "+b",
      "yb"
    ]
  },
  {
    "id": 90,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "/b",
      "Ac"
    ]
  },
  {
    "id": 91,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "/b",
      "Bc"
    ]
  },
  {
    "id": 92,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "/b",
      "Cc"
    ]
  },
  {
    "id": 93,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "/b",
      "Dc"
    ]
  },
  {
    "id": 94,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "/b",
      "Ec"
    ]
  },
  {
    "id": 95,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "/b",
      "Fc"
    ]
  },
  {
    "id": 96,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "/b",
      "Gc"
    ]
  },
  {
    "id": 100,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "va",
      "Hc"
    ]
  },
  {
    "id": 101,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "va",
      "Ic"
    ]
  },
  {
    "id": 102,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "va",
      "Jc"
    ]
  },
  {
    "id": 103,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "va",
      "Kc"
    ]
  },
  {
    "id": 104,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "va",
      "Lc"
    ]
  },
  {
    "id": 105,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "va",
      "Mc"
    ]
  },
  {
    "id": 106,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "va",
      "Nc"
    ]
  },
  {
    "id": 107,
    "guest": false,
    "nonbuyable": false,
    "prime": "t",
    "base": [
      "Oc"
    ]
  },
  {
    "id": 108,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "Pc"
    ]
  },
  {
    "id": 109,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "Qc"
    ]
  },
  {
    "id": 110,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "xa"
    ]
  },
  {
    "id": 111,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "ya"
    ]
  },
  {
    "id": 112,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "za"
    ]
  },
  {
    "id": 113,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "0a"
    ]
  },
  {
    "id": 114,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "1a"
    ]
  },
  {
    "id": 9077,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Rc"
    ]
  },
  {
    "id": 9078,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Sc"
    ]
  },
  {
    "id": 9146,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Tc"
    ]
  },
  {
    "id": 9147,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Uc"
    ]
  },
  {
    "id": 9148,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Vc"
    ]
  },
  {
    "id": 9149,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Wc"
    ]
  },
  {
    "id": 9150,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Xc"
    ]
  },
  {
    "id": 9151,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Yc"
    ]
  }
] as const;
export const WORMATE_PARENT_GLASSES = [
  {
    "id": 0,
    "guest": true,
    "nonbuyable": false,
    "base": []
  },
  {
    "id": 1,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "qe"
    ]
  },
  {
    "id": 2,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "re"
    ]
  },
  {
    "id": 3,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "se"
    ]
  },
  {
    "id": 11,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "te",
      "we"
    ]
  },
  {
    "id": 12,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "te",
      "ve"
    ]
  },
  {
    "id": 13,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "te",
      "ue"
    ]
  },
  {
    "id": 21,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "xe"
    ]
  },
  {
    "id": 31,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "ye",
      "ze"
    ]
  },
  {
    "id": 32,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "ye",
      "0e"
    ]
  },
  {
    "id": 33,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "ye",
      "1e"
    ]
  },
  {
    "id": 34,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "ye",
      "2e"
    ]
  },
  {
    "id": 35,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "ye",
      "3e"
    ]
  },
  {
    "id": 37,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "ye",
      "4e"
    ]
  },
  {
    "id": 41,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "5e"
    ]
  },
  {
    "id": 42,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "6e"
    ]
  },
  {
    "id": 43,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "7e"
    ]
  },
  {
    "id": 44,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "8e"
    ]
  },
  {
    "id": 45,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "9e"
    ]
  },
  {
    "id": 47,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "+e"
    ]
  },
  {
    "id": 48,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "/e"
    ]
  },
  {
    "id": 49,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "Af"
    ]
  },
  {
    "id": 50,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "Bf"
    ]
  },
  {
    "id": 51,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "Cf"
    ]
  },
  {
    "id": 9084,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "Df"
    ]
  },
  {
    "id": 9085,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Ef"
    ]
  },
  {
    "id": 9086,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Ff"
    ]
  },
  {
    "id": 9087,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Gf"
    ]
  }
] as const;
export const WORMATE_PARENT_HATS = [
  {
    "id": 0,
    "guest": true,
    "nonbuyable": false,
    "base": []
  },
  {
    "id": 1,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "Zc"
    ]
  },
  {
    "id": 2,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "ac"
    ]
  },
  {
    "id": 3,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "bc"
    ]
  },
  {
    "id": 4,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "cc"
    ]
  },
  {
    "id": 5,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "dc"
    ]
  },
  {
    "id": 6,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "ec"
    ]
  },
  {
    "id": 7,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "fc"
    ]
  },
  {
    "id": 11,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "gc"
    ]
  },
  {
    "id": 12,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "hc"
    ]
  },
  {
    "id": 13,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "ic"
    ]
  },
  {
    "id": 14,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "jc"
    ]
  },
  {
    "id": 15,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "kc"
    ]
  },
  {
    "id": 16,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "lc"
    ]
  },
  {
    "id": 17,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "mc"
    ]
  },
  {
    "id": 21,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "nc"
    ]
  },
  {
    "id": 22,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "oc"
    ]
  },
  {
    "id": 23,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "pc"
    ]
  },
  {
    "id": 24,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "qc"
    ]
  },
  {
    "id": 25,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "rc"
    ]
  },
  {
    "id": 26,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "sc"
    ]
  },
  {
    "id": 27,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "tc"
    ]
  },
  {
    "id": 31,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "uc"
    ]
  },
  {
    "id": 32,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "vc"
    ]
  },
  {
    "id": 33,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "wc"
    ]
  },
  {
    "id": 34,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "xc"
    ]
  },
  {
    "id": 35,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "yc"
    ]
  },
  {
    "id": 36,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "zc"
    ]
  },
  {
    "id": 37,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "0c"
    ]
  },
  {
    "id": 41,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "1c"
    ]
  },
  {
    "id": 42,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "2c"
    ]
  },
  {
    "id": 43,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "3c"
    ]
  },
  {
    "id": 44,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "4c"
    ]
  },
  {
    "id": 45,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "5c"
    ]
  },
  {
    "id": 46,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "6c"
    ]
  },
  {
    "id": 47,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "7c"
    ]
  },
  {
    "id": 51,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "8c",
      "9c"
    ]
  },
  {
    "id": 52,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "+c",
      "/c"
    ]
  },
  {
    "id": 53,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "Ad",
      "Bd"
    ]
  },
  {
    "id": 54,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "Cd",
      "Dd"
    ]
  },
  {
    "id": 55,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "Ed",
      "9c"
    ]
  },
  {
    "id": 56,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "Fd",
      "Gd"
    ]
  },
  {
    "id": 57,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "Hd",
      "Gd"
    ]
  },
  {
    "id": 61,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "Id",
      "Jd",
      "Kd"
    ]
  },
  {
    "id": 62,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "Ld",
      "Md",
      "Nd"
    ]
  },
  {
    "id": 63,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "Od",
      "Pd",
      "Qd"
    ]
  },
  {
    "id": 64,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "Rd",
      "Sd",
      "Td"
    ]
  },
  {
    "id": 65,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "Ud",
      "Vd",
      "Wd"
    ]
  },
  {
    "id": 66,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "Xd",
      "Yd",
      "Zd"
    ]
  },
  {
    "id": 67,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "ad",
      "bd",
      "cd"
    ]
  },
  {
    "id": 71,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "dd"
    ]
  },
  {
    "id": 72,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "ed"
    ]
  },
  {
    "id": 73,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "fd"
    ]
  },
  {
    "id": 74,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "gd"
    ]
  },
  {
    "id": 75,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "hd"
    ]
  },
  {
    "id": 76,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "id"
    ]
  },
  {
    "id": 77,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "jd"
    ]
  },
  {
    "id": 81,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "kd",
      "ld"
    ]
  },
  {
    "id": 82,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "md",
      "nd"
    ]
  },
  {
    "id": 83,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "od",
      "pd"
    ]
  },
  {
    "id": 84,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "qd",
      "rd"
    ]
  },
  {
    "id": 85,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "sd",
      "ld"
    ]
  },
  {
    "id": 86,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "td",
      "ud"
    ]
  },
  {
    "id": 87,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "vd",
      "ud"
    ]
  },
  {
    "id": 91,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "wd"
    ]
  },
  {
    "id": 92,
    "guest": false,
    "nonbuyable": false,
    "prime": "k",
    "base": [
      "xd"
    ]
  },
  {
    "id": 93,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "yd"
    ]
  },
  {
    "id": 94,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "zd"
    ]
  },
  {
    "id": 95,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "0d"
    ]
  },
  {
    "id": 96,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "1d"
    ]
  },
  {
    "id": 97,
    "guest": false,
    "nonbuyable": false,
    "prime": "m",
    "base": [
      "2d"
    ]
  },
  {
    "id": 100,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "3d"
    ]
  },
  {
    "id": 110,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "4d"
    ]
  },
  {
    "id": 120,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "5d"
    ]
  },
  {
    "id": 130,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "6d"
    ]
  },
  {
    "id": 140,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "7d"
    ]
  },
  {
    "id": 150,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "8d"
    ]
  },
  {
    "id": 160,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "9d"
    ]
  },
  {
    "id": 170,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "+d"
    ]
  },
  {
    "id": 180,
    "guest": false,
    "nonbuyable": false,
    "prime": "u",
    "base": [
      "/d"
    ]
  },
  {
    "id": 181,
    "guest": false,
    "nonbuyable": false,
    "prime": "v",
    "base": [
      "Ae"
    ]
  },
  {
    "id": 182,
    "guest": false,
    "nonbuyable": false,
    "prime": "w",
    "base": [
      "Be"
    ]
  },
  {
    "id": 190,
    "guest": false,
    "nonbuyable": false,
    "prime": "x",
    "base": [
      "Ce"
    ]
  },
  {
    "id": 191,
    "guest": false,
    "nonbuyable": false,
    "prime": "y",
    "base": [
      "De"
    ]
  },
  {
    "id": 192,
    "guest": false,
    "nonbuyable": false,
    "prime": "z",
    "base": [
      "Ee"
    ]
  },
  {
    "id": 200,
    "guest": false,
    "nonbuyable": false,
    "prime": "0",
    "base": [
      "Fe"
    ]
  },
  {
    "id": 201,
    "guest": false,
    "nonbuyable": false,
    "prime": "1",
    "base": [
      "Ge"
    ]
  },
  {
    "id": 202,
    "guest": false,
    "nonbuyable": false,
    "prime": "2",
    "base": [
      "He"
    ]
  },
  {
    "id": 203,
    "guest": false,
    "nonbuyable": false,
    "prime": "0",
    "base": [
      "Ie"
    ]
  },
  {
    "id": 204,
    "guest": false,
    "nonbuyable": false,
    "prime": "3",
    "base": [
      "Je"
    ]
  },
  {
    "id": 205,
    "guest": false,
    "nonbuyable": false,
    "prime": "0",
    "base": [
      "Ke"
    ]
  },
  {
    "id": 210,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Le"
    ]
  },
  {
    "id": 220,
    "guest": false,
    "nonbuyable": false,
    "prime": "l",
    "base": [
      "Me"
    ]
  },
  {
    "id": 221,
    "guest": false,
    "nonbuyable": false,
    "prime": "p",
    "base": [
      "Ne"
    ]
  },
  {
    "id": 222,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "Oe"
    ]
  },
  {
    "id": 230,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Pe"
    ]
  },
  {
    "id": 231,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Qe"
    ]
  },
  {
    "id": 232,
    "guest": false,
    "nonbuyable": false,
    "prime": "4",
    "base": [
      "Re",
      "Se"
    ]
  },
  {
    "id": 233,
    "guest": false,
    "nonbuyable": false,
    "prime": "5",
    "base": [
      "Te",
      "Ue"
    ]
  },
  {
    "id": 234,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Ve"
    ]
  },
  {
    "id": 235,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "We"
    ]
  },
  {
    "id": 236,
    "guest": false,
    "nonbuyable": false,
    "base": [
      "Xe"
    ]
  },
  {
    "id": 9082,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "Ye"
    ]
  },
  {
    "id": 9083,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "Ze"
    ]
  },
  {
    "id": 9084,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "ae"
    ]
  },
  {
    "id": 9085,
    "guest": false,
    "nonbuyable": false,
    "prime": "6",
    "base": [
      "be"
    ]
  },
  {
    "id": 9086,
    "guest": false,
    "nonbuyable": false,
    "prime": "7",
    "base": [
      "ce"
    ]
  },
  {
    "id": 9087,
    "guest": false,
    "nonbuyable": false,
    "prime": "8",
    "base": [
      "de"
    ]
  },
  {
    "id": 9088,
    "guest": false,
    "nonbuyable": false,
    "prime": "q",
    "base": [
      "ee",
      "fe"
    ]
  },
  {
    "id": 9089,
    "guest": false,
    "nonbuyable": false,
    "prime": "r",
    "base": [
      "ge",
      "fe"
    ]
  },
  {
    "id": 9090,
    "guest": false,
    "nonbuyable": false,
    "prime": "s",
    "base": [
      "he",
      "fe"
    ]
  },
  {
    "id": 9193,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "ie"
    ]
  },
  {
    "id": 9194,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "je"
    ]
  },
  {
    "id": 9195,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "ke"
    ]
  },
  {
    "id": 9196,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "le"
    ]
  },
  {
    "id": 9197,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "me"
    ]
  },
  {
    "id": 9198,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "ne"
    ]
  },
  {
    "id": 9199,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "oe"
    ]
  },
  {
    "id": 9200,
    "guest": false,
    "nonbuyable": true,
    "base": [
      "pe"
    ]
  }
] as const;
export const WORMATE_PARENT_PORTIONS = [
  {
    "id": 0,
    "base": "M",
    "glow": "L"
  },
  {
    "id": 1,
    "base": "N",
    "glow": "L"
  },
  {
    "id": 2,
    "base": "O",
    "glow": "L"
  },
  {
    "id": 3,
    "base": "P",
    "glow": "L"
  },
  {
    "id": 4,
    "base": "Q",
    "glow": "L"
  },
  {
    "id": 5,
    "base": "R",
    "glow": "L"
  },
  {
    "id": 6,
    "base": "S",
    "glow": "L"
  },
  {
    "id": 7,
    "base": "T",
    "glow": "L"
  },
  {
    "id": 8,
    "base": "U",
    "glow": "L"
  },
  {
    "id": 9,
    "base": "V",
    "glow": "L"
  },
  {
    "id": 10,
    "base": "W",
    "glow": "L"
  },
  {
    "id": 11,
    "base": "X",
    "glow": "L"
  },
  {
    "id": 12,
    "base": "Y",
    "glow": "L"
  },
  {
    "id": 13,
    "base": "Z",
    "glow": "L"
  },
  {
    "id": 14,
    "base": "a",
    "glow": "L"
  },
  {
    "id": 15,
    "base": "b",
    "glow": "L"
  },
  {
    "id": 16,
    "base": "c",
    "glow": "L"
  },
  {
    "id": 17,
    "base": "d",
    "glow": "L"
  },
  {
    "id": 18,
    "base": "e",
    "glow": "L"
  },
  {
    "id": 19,
    "base": "f",
    "glow": "L"
  },
  {
    "id": 20,
    "base": "g",
    "glow": "L"
  },
  {
    "id": 21,
    "base": "h",
    "glow": "L"
  },
  {
    "id": 22,
    "base": "i",
    "glow": "L"
  },
  {
    "id": 23,
    "base": "j",
    "glow": "L"
  },
  {
    "id": 24,
    "base": "k",
    "glow": "L"
  },
  {
    "id": 25,
    "base": "l",
    "glow": "L"
  },
  {
    "id": 26,
    "base": "m",
    "glow": "L"
  },
  {
    "id": 27,
    "base": "n",
    "glow": "L"
  },
  {
    "id": 28,
    "base": "o",
    "glow": "L"
  },
  {
    "id": 29,
    "base": "p",
    "glow": "L"
  },
  {
    "id": 30,
    "base": "q",
    "glow": "L"
  },
  {
    "id": 31,
    "base": "r",
    "glow": "L"
  },
  {
    "id": 32,
    "base": "s",
    "glow": "L"
  },
  {
    "id": 33,
    "base": "t",
    "glow": "L"
  },
  {
    "id": 34,
    "base": "u",
    "glow": "L"
  },
  {
    "id": 35,
    "base": "v",
    "glow": "L"
  },
  {
    "id": 36,
    "base": "w",
    "glow": "L"
  },
  {
    "id": 37,
    "base": "x",
    "glow": "L"
  },
  {
    "id": 81,
    "base": "y",
    "glow": "z"
  },
  {
    "id": 82,
    "base": "0",
    "glow": "z"
  },
  {
    "id": 83,
    "base": "1",
    "glow": "z"
  },
  {
    "id": 84,
    "base": "2",
    "glow": "z"
  },
  {
    "id": 85,
    "base": "3",
    "glow": "z"
  },
  {
    "id": 86,
    "base": "4",
    "glow": "z"
  },
  {
    "id": 87,
    "base": "5",
    "glow": "z"
  },
  {
    "id": 88,
    "base": "6",
    "glow": "z"
  },
  {
    "id": 90,
    "base": "7",
    "glow": "8"
  },
  {
    "id": 91,
    "base": "9",
    "glow": "8"
  },
  {
    "id": 92,
    "base": "+",
    "glow": "8"
  },
  {
    "id": 93,
    "base": "/",
    "glow": "8"
  },
  {
    "id": 94,
    "base": "AB",
    "glow": "8"
  }
] as const;
export const WORMATE_PARENT_ABILITIES = [
  {
    "id": 0,
    "base": "CB"
  },
  {
    "id": 1,
    "base": "DB"
  },
  {
    "id": 2,
    "base": "EB"
  },
  {
    "id": 3,
    "base": "FB"
  },
  {
    "id": 4,
    "base": "GB"
  },
  {
    "id": 5,
    "base": "HB"
  },
  {
    "id": 6,
    "base": "IB"
  }
] as const;

export const WORMATE_PARENT_REGIONS = {
  "0": {
    "texture": "portions",
    "x": 52,
    "y": 318,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "1": {
    "texture": "portions",
    "x": 2,
    "y": 264,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "2": {
    "texture": "portions",
    "x": 311,
    "y": 288,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "3": {
    "texture": "portions",
    "x": 105,
    "y": 256,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "4": {
    "texture": "portions",
    "x": 55,
    "y": 256,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "5": {
    "texture": "portions",
    "x": 245,
    "y": 293,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "6": {
    "texture": "portions",
    "x": 155,
    "y": 303,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "7": {
    "texture": "portions",
    "x": 102,
    "y": 318,
    "w": 48,
    "h": 54,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "8": {
    "texture": "portions",
    "x": 135,
    "y": 2,
    "w": 61,
    "h": 62,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "9": {
    "texture": "portions",
    "x": 55,
    "y": 202,
    "w": 59,
    "h": 50,
    "px": 32.5,
    "py": 33,
    "pw": 64,
    "ph": 64
  },
  "+": {
    "texture": "portions",
    "x": 444,
    "y": 133,
    "w": 60,
    "h": 50,
    "px": 32,
    "py": 33,
    "pw": 64,
    "ph": 64
  },
  "+B": {
    "texture": "skins",
    "x": 818,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "+C": {
    "texture": "skins",
    "x": 274,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "+D": {
    "texture": "skins",
    "x": 2450,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "+E": {
    "texture": "skins",
    "x": 2518,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "+F": {
    "texture": "skins",
    "x": 614,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "+G": {
    "texture": "skins",
    "x": 1226,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "+H": {
    "texture": "skins",
    "x": 818,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "+I": {
    "texture": "skins",
    "x": 1090,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "+J": {
    "texture": "skins",
    "x": 818,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "+K": {
    "texture": "skins",
    "x": 2654,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "+L": {
    "texture": "skins",
    "x": 138,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "+M": {
    "texture": "skins",
    "x": 886,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "+N": {
    "texture": "skins",
    "x": 2,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "+O": {
    "texture": "skins",
    "x": 1430,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "+P": {
    "texture": "skins",
    "x": 410,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "+Q": {
    "texture": "skins",
    "x": 342,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "+R": {
    "texture": "skins",
    "x": 138,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "+S": {
    "texture": "skins",
    "x": 2314,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "+T": {
    "texture": "skins",
    "x": 138,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "+U": {
    "texture": "skins",
    "x": 2926,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "+V": {
    "texture": "skins",
    "x": 342,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "+W": {
    "texture": "skins",
    "x": 682,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "+X": {
    "texture": "skins",
    "x": 1498,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "+Y": {
    "texture": "skins",
    "x": 3966,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "+Z": {
    "texture": "skins",
    "x": 2382,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "+a": {
    "texture": "wear",
    "x": 1591,
    "y": 337,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "+b": {
    "texture": "wear",
    "x": 1483,
    "y": 1039,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "+c": {
    "texture": "wear",
    "x": 406,
    "y": 1698,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "+d": {
    "texture": "wear",
    "x": 784,
    "y": 1764,
    "w": 92,
    "h": 207,
    "px": 24,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "+e": {
    "texture": "wear",
    "x": 1252,
    "y": 1562,
    "w": 53,
    "h": 136,
    "px": 76.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "/": {
    "texture": "portions",
    "x": 453,
    "y": 69,
    "w": 50,
    "h": 60,
    "px": 34,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "/B": {
    "texture": "skins",
    "x": 1226,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "/C": {
    "texture": "skins",
    "x": 1158,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "/D": {
    "texture": "skins",
    "x": 3402,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "/E": {
    "texture": "skins",
    "x": 546,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "/F": {
    "texture": "skins",
    "x": 682,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "/G": {
    "texture": "skins",
    "x": 1430,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "/H": {
    "texture": "skins",
    "x": 206,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "/I": {
    "texture": "skins",
    "x": 1090,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "/J": {
    "texture": "skins",
    "x": 818,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "/K": {
    "texture": "skins",
    "x": 274,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "/L": {
    "texture": "skins",
    "x": 3470,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "/M": {
    "texture": "skins",
    "x": 2586,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "/N": {
    "texture": "skins",
    "x": 1430,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "/O": {
    "texture": "skins",
    "x": 3402,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "/P": {
    "texture": "skins",
    "x": 2654,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "/Q": {
    "texture": "skins",
    "x": 1838,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "/R": {
    "texture": "skins",
    "x": 410,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "/S": {
    "texture": "skins",
    "x": 682,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "/T": {
    "texture": "skins",
    "x": 3878,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "/U": {
    "texture": "skins",
    "x": 2314,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "/V": {
    "texture": "skins",
    "x": 1430,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "/W": {
    "texture": "skins",
    "x": 2586,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "/X": {
    "texture": "skins",
    "x": 1566,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "/Y": {
    "texture": "skins",
    "x": 3606,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "/Z": {
    "texture": "skins",
    "x": 2654,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "/a": {
    "texture": "wear",
    "x": 1585,
    "y": 748,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "/b": {
    "texture": "wear",
    "x": 1602,
    "y": 585,
    "w": 11,
    "h": 32,
    "px": 99.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "/c": {
    "texture": "wear",
    "x": 955,
    "y": 140,
    "w": 9,
    "h": 136,
    "px": 91.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "/d": {
    "texture": "wear",
    "x": 387,
    "y": 2,
    "w": 178,
    "h": 132,
    "px": 41,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "/e": {
    "texture": "wear",
    "x": 1192,
    "y": 1650,
    "w": 56,
    "h": 131,
    "px": 74,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "0B": {
    "texture": "skins",
    "x": 2994,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "0C": {
    "texture": "skins",
    "x": 2314,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "0D": {
    "texture": "skins",
    "x": 138,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "0E": {
    "texture": "skins",
    "x": 2450,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "0F": {
    "texture": "skins",
    "x": 954,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "0G": {
    "texture": "skins",
    "x": 1226,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "0H": {
    "texture": "skins",
    "x": 1974,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "0I": {
    "texture": "skins",
    "x": 2314,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "0J": {
    "texture": "skins",
    "x": 1158,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "0K": {
    "texture": "skins",
    "x": 3642,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "0L": {
    "texture": "skins",
    "x": 1634,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "0M": {
    "texture": "skins",
    "x": 1022,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "0N": {
    "texture": "skins",
    "x": 682,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "0O": {
    "texture": "skins",
    "x": 3334,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "0P": {
    "texture": "skins",
    "x": 818,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "0Q": {
    "texture": "skins",
    "x": 2722,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "0R": {
    "texture": "skins",
    "x": 206,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "0S": {
    "texture": "skins",
    "x": 886,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "0T": {
    "texture": "skins",
    "x": 70,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "0U": {
    "texture": "skins",
    "x": 614,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "0V": {
    "texture": "skins",
    "x": 206,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "0W": {
    "texture": "skins",
    "x": 1158,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "0X": {
    "texture": "skins",
    "x": 206,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "0Y": {
    "texture": "skins",
    "x": 2858,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "0Z": {
    "texture": "skins",
    "x": 3246,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "0a": {
    "texture": "wear",
    "x": 1138,
    "y": 912,
    "w": 21,
    "h": 58,
    "px": 107.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "0b": {
    "texture": "wear",
    "x": 1486,
    "y": 607,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "0c": {
    "texture": "wear",
    "x": 786,
    "y": 1083,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "0d": {
    "texture": "wear",
    "x": 476,
    "y": 780,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "0e": {
    "texture": "wear",
    "x": 1498,
    "y": 260,
    "w": 45,
    "h": 128,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "1B": {
    "texture": "skins",
    "x": 1702,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "1C": {
    "texture": "skins",
    "x": 138,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "1D": {
    "texture": "skins",
    "x": 342,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "1E": {
    "texture": "skins",
    "x": 2790,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "1F": {
    "texture": "skins",
    "x": 3538,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "1G": {
    "texture": "skins",
    "x": 1838,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "1H": {
    "texture": "skins",
    "x": 1430,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "1I": {
    "texture": "skins",
    "x": 2246,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "1J": {
    "texture": "skins",
    "x": 2042,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "1K": {
    "texture": "skins",
    "x": 1566,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "1L": {
    "texture": "skins",
    "x": 2654,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "1M": {
    "texture": "skins",
    "x": 546,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "1N": {
    "texture": "skins",
    "x": 750,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "1O": {
    "texture": "skins",
    "x": 614,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "1P": {
    "texture": "skins",
    "x": 1770,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "1Q": {
    "texture": "skins",
    "x": 2450,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "1R": {
    "texture": "skins",
    "x": 2790,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "1S": {
    "texture": "skins",
    "x": 3198,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "1T": {
    "texture": "skins",
    "x": 1022,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "1U": {
    "texture": "skins",
    "x": 3470,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "1V": {
    "texture": "skins",
    "x": 2654,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "1W": {
    "texture": "skins",
    "x": 1294,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "1X": {
    "texture": "skins",
    "x": 1906,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "1Y": {
    "texture": "skins",
    "x": 206,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "1Z": {
    "texture": "skins",
    "x": 3930,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "1a": {
    "texture": "wear",
    "x": 1460,
    "y": 2,
    "w": 41,
    "h": 118,
    "px": 112.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "1b": {
    "texture": "wear",
    "x": 1430,
    "y": 518,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "1c": {
    "texture": "wear",
    "x": 881,
    "y": 2,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "1d": {
    "texture": "wear",
    "x": 327,
    "y": 1123,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "1e": {
    "texture": "wear",
    "x": 1486,
    "y": 412,
    "w": 45,
    "h": 128,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "2B": {
    "texture": "skins",
    "x": 3946,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "2C": {
    "texture": "skins",
    "x": 2382,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "2D": {
    "texture": "skins",
    "x": 206,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "2E": {
    "texture": "skins",
    "x": 2,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "2F": {
    "texture": "skins",
    "x": 206,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "2G": {
    "texture": "skins",
    "x": 1838,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "2H": {
    "texture": "skins",
    "x": 2382,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "2I": {
    "texture": "skins",
    "x": 2110,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "2J": {
    "texture": "skins",
    "x": 1294,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "2K": {
    "texture": "skins",
    "x": 1634,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "2L": {
    "texture": "skins",
    "x": 3334,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "2M": {
    "texture": "skins",
    "x": 750,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "2N": {
    "texture": "skins",
    "x": 886,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "2O": {
    "texture": "skins",
    "x": 3062,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "2P": {
    "texture": "skins",
    "x": 2790,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "2Q": {
    "texture": "skins",
    "x": 1702,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "2R": {
    "texture": "skins",
    "x": 954,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "2S": {
    "texture": "skins",
    "x": 1362,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "2T": {
    "texture": "skins",
    "x": 3606,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "2U": {
    "texture": "skins",
    "x": 1566,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "2V": {
    "texture": "skins",
    "x": 1974,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "2W": {
    "texture": "skins",
    "x": 70,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "2X": {
    "texture": "skins",
    "x": 2858,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "2Y": {
    "texture": "skins",
    "x": 3810,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "2Z": {
    "texture": "skins",
    "x": 2858,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "2a": {
    "texture": "wear",
    "x": 1579,
    "y": 386,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "2b": {
    "texture": "wear",
    "x": 92,
    "y": 1995,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "2c": {
    "texture": "wear",
    "x": 965,
    "y": 964,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "2d": {
    "texture": "wear",
    "x": 411,
    "y": 298,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "2e": {
    "texture": "wear",
    "x": 1510,
    "y": 2,
    "w": 45,
    "h": 128,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "3B": {
    "texture": "skins",
    "x": 3678,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "3C": {
    "texture": "skins",
    "x": 3062,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "3D": {
    "texture": "skins",
    "x": 3894,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "3E": {
    "texture": "skins",
    "x": 2178,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "3F": {
    "texture": "skins",
    "x": 1906,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "3G": {
    "texture": "skins",
    "x": 682,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "3H": {
    "texture": "skins",
    "x": 2450,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "3I": {
    "texture": "skins",
    "x": 1770,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "3J": {
    "texture": "skins",
    "x": 3538,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "3K": {
    "texture": "skins",
    "x": 2178,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "3L": {
    "texture": "skins",
    "x": 1838,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "3M": {
    "texture": "skins",
    "x": 818,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "3N": {
    "texture": "skins",
    "x": 546,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "3O": {
    "texture": "skins",
    "x": 2042,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "3P": {
    "texture": "skins",
    "x": 1430,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "3Q": {
    "texture": "skins",
    "x": 70,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "3R": {
    "texture": "skins",
    "x": 3742,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "3S": {
    "texture": "skins",
    "x": 1022,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "3T": {
    "texture": "skins",
    "x": 1226,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "3U": {
    "texture": "skins",
    "x": 1022,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "3V": {
    "texture": "skins",
    "x": 3810,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "3W": {
    "texture": "skins",
    "x": 1498,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "3X": {
    "texture": "skins",
    "x": 2518,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "3Y": {
    "texture": "skins",
    "x": 2042,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "3Z": {
    "texture": "skins",
    "x": 750,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "3a": {
    "texture": "wear",
    "x": 1574,
    "y": 707,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "3b": {
    "texture": "wear",
    "x": 1306,
    "y": 1702,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "3c": {
    "texture": "wear",
    "x": 1020,
    "y": 1378,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "3d": {
    "texture": "wear",
    "x": 981,
    "y": 1923,
    "w": 67,
    "h": 120,
    "px": 16.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "3e": {
    "texture": "wear",
    "x": 1439,
    "y": 810,
    "w": 45,
    "h": 128,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "4B": {
    "texture": "skins",
    "x": 1294,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "4C": {
    "texture": "skins",
    "x": 274,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "4D": {
    "texture": "skins",
    "x": 1498,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "4E": {
    "texture": "skins",
    "x": 2246,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "4F": {
    "texture": "skins",
    "x": 1498,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "4G": {
    "texture": "skins",
    "x": 1158,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "4H": {
    "texture": "skins",
    "x": 2042,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "4I": {
    "texture": "skins",
    "x": 2586,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "4J": {
    "texture": "skins",
    "x": 138,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "4K": {
    "texture": "skins",
    "x": 70,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "4L": {
    "texture": "skins",
    "x": 886,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "4M": {
    "texture": "skins",
    "x": 1702,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "4N": {
    "texture": "skins",
    "x": 3810,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "4O": {
    "texture": "skins",
    "x": 3946,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "4P": {
    "texture": "skins",
    "x": 1906,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "4Q": {
    "texture": "skins",
    "x": 2110,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "4R": {
    "texture": "skins",
    "x": 2654,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "4S": {
    "texture": "skins",
    "x": 2450,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "4T": {
    "texture": "skins",
    "x": 1362,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "4U": {
    "texture": "skins",
    "x": 70,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "4V": {
    "texture": "skins",
    "x": 1498,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "4W": {
    "texture": "skins",
    "x": 1294,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "4X": {
    "texture": "skins",
    "x": 2178,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "4Y": {
    "texture": "skins",
    "x": 274,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "4Z": {
    "texture": "skins",
    "x": 1226,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "4a": {
    "texture": "wear",
    "x": 1570,
    "y": 759,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "4b": {
    "texture": "wear",
    "x": 1309,
    "y": 1666,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "4c": {
    "texture": "wear",
    "x": 981,
    "y": 1647,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "4d": {
    "texture": "wear",
    "x": 677,
    "y": 1592,
    "w": 114,
    "h": 168,
    "px": 39,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "4e": {
    "texture": "wear",
    "x": 1362,
    "y": 1800,
    "w": 45,
    "h": 128,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "5B": {
    "texture": "skins",
    "x": 2314,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "5C": {
    "texture": "skins",
    "x": 2314,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "5D": {
    "texture": "skins",
    "x": 1430,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "5E": {
    "texture": "skins",
    "x": 1498,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "5F": {
    "texture": "skins",
    "x": 682,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "5G": {
    "texture": "skins",
    "x": 2790,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "5H": {
    "texture": "skins",
    "x": 1430,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "5I": {
    "texture": "skins",
    "x": 1498,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "5J": {
    "texture": "skins",
    "x": 4014,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "5K": {
    "texture": "skins",
    "x": 2246,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "5L": {
    "texture": "skins",
    "x": 410,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "5M": {
    "texture": "skins",
    "x": 3334,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "5N": {
    "texture": "skins",
    "x": 546,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "5O": {
    "texture": "skins",
    "x": 410,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "5P": {
    "texture": "skins",
    "x": 750,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "5Q": {
    "texture": "skins",
    "x": 1090,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "5R": {
    "texture": "skins",
    "x": 2586,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "5S": {
    "texture": "skins",
    "x": 1430,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "5T": {
    "texture": "skins",
    "x": 206,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "5U": {
    "texture": "skins",
    "x": 1702,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "5V": {
    "texture": "skins",
    "x": 206,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "5W": {
    "texture": "skins",
    "x": 342,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "5X": {
    "texture": "skins",
    "x": 478,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "5Y": {
    "texture": "skins",
    "x": 3334,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "5Z": {
    "texture": "skins",
    "x": 1022,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "5a": {
    "texture": "wear",
    "x": 1579,
    "y": 468,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "5b": {
    "texture": "wear",
    "x": 1442,
    "y": 278,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "5c": {
    "texture": "wear",
    "x": 981,
    "y": 1785,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "5d": {
    "texture": "wear",
    "x": 981,
    "y": 150,
    "w": 80,
    "h": 138,
    "px": 12,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "5e": {
    "texture": "wear",
    "x": 1206,
    "y": 1422,
    "w": 53,
    "h": 136,
    "px": 76.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "6B": {
    "texture": "skins",
    "x": 1226,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "6C": {
    "texture": "skins",
    "x": 886,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "6D": {
    "texture": "skins",
    "x": 3130,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "6E": {
    "texture": "skins",
    "x": 818,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "6F": {
    "texture": "skins",
    "x": 682,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "6G": {
    "texture": "skins",
    "x": 3674,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "6H": {
    "texture": "skins",
    "x": 478,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "6I": {
    "texture": "skins",
    "x": 2586,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "6J": {
    "texture": "skins",
    "x": 2382,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "6K": {
    "texture": "skins",
    "x": 2382,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "6L": {
    "texture": "skins",
    "x": 2314,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "6M": {
    "texture": "skins",
    "x": 2654,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "6N": {
    "texture": "skins",
    "x": 2,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "6O": {
    "texture": "skins",
    "x": 750,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "6P": {
    "texture": "skins",
    "x": 2654,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "6Q": {
    "texture": "skins",
    "x": 1974,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "6R": {
    "texture": "skins",
    "x": 1362,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "6S": {
    "texture": "skins",
    "x": 1090,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "6T": {
    "texture": "skins",
    "x": 1906,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "6U": {
    "texture": "skins",
    "x": 2790,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "6V": {
    "texture": "skins",
    "x": 410,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "6W": {
    "texture": "skins",
    "x": 1634,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "6X": {
    "texture": "skins",
    "x": 1838,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "6Y": {
    "texture": "skins",
    "x": 682,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "6Z": {
    "texture": "skins",
    "x": 478,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "6a": {
    "texture": "wear",
    "x": 1591,
    "y": 260,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "6b": {
    "texture": "wear",
    "x": 1428,
    "y": 1307,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "6c": {
    "texture": "wear",
    "x": 990,
    "y": 1102,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "6d": {
    "texture": "wear",
    "x": 890,
    "y": 1128,
    "w": 86,
    "h": 86,
    "px": -13,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "6e": {
    "texture": "wear",
    "x": 1246,
    "y": 1252,
    "w": 53,
    "h": 136,
    "px": 76.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "7B": {
    "texture": "skins",
    "x": 3946,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "7C": {
    "texture": "skins",
    "x": 3102,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "7D": {
    "texture": "skins",
    "x": 2314,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "7E": {
    "texture": "skins",
    "x": 886,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "7F": {
    "texture": "skins",
    "x": 1770,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "7G": {
    "texture": "skins",
    "x": 3402,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "7H": {
    "texture": "skins",
    "x": 2178,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "7I": {
    "texture": "skins",
    "x": 1974,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "7J": {
    "texture": "skins",
    "x": 2722,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "7K": {
    "texture": "skins",
    "x": 614,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "7L": {
    "texture": "skins",
    "x": 750,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "7M": {
    "texture": "skins",
    "x": 1430,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "7N": {
    "texture": "skins",
    "x": 1294,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "7O": {
    "texture": "skins",
    "x": 2042,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "7P": {
    "texture": "skins",
    "x": 2994,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "7Q": {
    "texture": "skins",
    "x": 1090,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "7R": {
    "texture": "skins",
    "x": 2518,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "7S": {
    "texture": "skins",
    "x": 1158,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "7T": {
    "texture": "skins",
    "x": 1362,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "7U": {
    "texture": "skins",
    "x": 3606,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "7V": {
    "texture": "skins",
    "x": 3538,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "7W": {
    "texture": "skins",
    "x": 2382,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "7X": {
    "texture": "skins",
    "x": 2110,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "7Y": {
    "texture": "skins",
    "x": 818,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "7Z": {
    "texture": "skins",
    "x": 750,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "7a": {
    "texture": "wear",
    "x": 1570,
    "y": 800,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "7b": {
    "texture": "wear",
    "x": 1383,
    "y": 812,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "7c": {
    "texture": "wear",
    "x": 1002,
    "y": 1240,
    "w": 85,
    "h": 134,
    "px": 18.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "7d": {
    "texture": "wear",
    "x": 890,
    "y": 964,
    "w": 71,
    "h": 160,
    "px": 13.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "7e": {
    "texture": "wear",
    "x": 1263,
    "y": 1392,
    "w": 53,
    "h": 136,
    "px": 76.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "8B": {
    "texture": "skins",
    "x": 478,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "8C": {
    "texture": "skins",
    "x": 70,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "8D": {
    "texture": "skins",
    "x": 410,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "8E": {
    "texture": "skins",
    "x": 1974,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "8F": {
    "texture": "skins",
    "x": 818,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "8G": {
    "texture": "skins",
    "x": 1838,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "8H": {
    "texture": "skins",
    "x": 410,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "8I": {
    "texture": "skins",
    "x": 1362,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "8J": {
    "texture": "skins",
    "x": 2654,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "8K": {
    "texture": "skins",
    "x": 546,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "8L": {
    "texture": "skins",
    "x": 1634,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "8M": {
    "texture": "skins",
    "x": 1498,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "8N": {
    "texture": "skins",
    "x": 818,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "8O": {
    "texture": "skins",
    "x": 2518,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "8P": {
    "texture": "skins",
    "x": 3714,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "8Q": {
    "texture": "skins",
    "x": 2,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "8R": {
    "texture": "skins",
    "x": 2042,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "8S": {
    "texture": "skins",
    "x": 1090,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "8T": {
    "texture": "skins",
    "x": 1974,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "8U": {
    "texture": "skins",
    "x": 2858,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "8V": {
    "texture": "skins",
    "x": 3946,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "8W": {
    "texture": "skins",
    "x": 3470,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "8X": {
    "texture": "skins",
    "x": 3674,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "8Y": {
    "texture": "skins",
    "x": 2518,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "8Z": {
    "texture": "skins",
    "x": 342,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "8a": {
    "texture": "wear",
    "x": 1579,
    "y": 427,
    "w": 11,
    "h": 37,
    "px": 100.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "8b": {
    "texture": "wear",
    "x": 1449,
    "y": 1892,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "8c": {
    "texture": "wear",
    "x": 706,
    "y": 147,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "8d": {
    "texture": "wear",
    "x": 1378,
    "y": 2,
    "w": 78,
    "h": 120,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "8e": {
    "texture": "wear",
    "x": 1249,
    "y": 1785,
    "w": 53,
    "h": 136,
    "px": 76.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "9B": {
    "texture": "skins",
    "x": 2178,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "9C": {
    "texture": "skins",
    "x": 2994,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "9D": {
    "texture": "skins",
    "x": 1770,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "9E": {
    "texture": "skins",
    "x": 3462,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "9F": {
    "texture": "skins",
    "x": 1566,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "9G": {
    "texture": "skins",
    "x": 954,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "9H": {
    "texture": "skins",
    "x": 546,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "9I": {
    "texture": "skins",
    "x": 3130,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "9J": {
    "texture": "skins",
    "x": 682,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "9K": {
    "texture": "skins",
    "x": 1022,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "9L": {
    "texture": "skins",
    "x": 2926,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "9M": {
    "texture": "skins",
    "x": 1430,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "9N": {
    "texture": "skins",
    "x": 750,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "9O": {
    "texture": "skins",
    "x": 2246,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "9P": {
    "texture": "skins",
    "x": 3402,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "9Q": {
    "texture": "skins",
    "x": 478,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "9R": {
    "texture": "skins",
    "x": 2722,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "9S": {
    "texture": "skins",
    "x": 1294,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "9T": {
    "texture": "skins",
    "x": 2314,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "9U": {
    "texture": "skins",
    "x": 2518,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "9V": {
    "texture": "skins",
    "x": 2722,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "9W": {
    "texture": "skins",
    "x": 2722,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "9X": {
    "texture": "skins",
    "x": 274,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "9Y": {
    "texture": "skins",
    "x": 4002,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "9Z": {
    "texture": "skins",
    "x": 2110,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "9a": {
    "texture": "wear",
    "x": 963,
    "y": 2012,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "9b": {
    "texture": "wear",
    "x": 1424,
    "y": 676,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "9c": {
    "texture": "wear",
    "x": 1533,
    "y": 1595,
    "w": 9,
    "h": 136,
    "px": 91.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "9d": {
    "texture": "wear",
    "x": 1304,
    "y": 1110,
    "w": 36,
    "h": 184,
    "px": 6,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "9e": {
    "texture": "wear",
    "x": 1192,
    "y": 1785,
    "w": 53,
    "h": 136,
    "px": 76.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "AB": {
    "texture": "portions",
    "x": 388,
    "y": 2,
    "w": 61,
    "h": 55,
    "px": 33.5,
    "py": 31.5,
    "pw": 64,
    "ph": 64
  },
  "AC": {
    "texture": "skins",
    "x": 1226,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "AD": {
    "texture": "skins",
    "x": 3266,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "AE": {
    "texture": "skins",
    "x": 1566,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "AF": {
    "texture": "skins",
    "x": 3334,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "AG": {
    "texture": "skins",
    "x": 682,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "AH": {
    "texture": "skins",
    "x": 1770,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "AI": {
    "texture": "skins",
    "x": 3334,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "AJ": {
    "texture": "skins",
    "x": 682,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "AK": {
    "texture": "skins",
    "x": 2790,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "AL": {
    "texture": "skins",
    "x": 70,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "AM": {
    "texture": "skins",
    "x": 2314,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "AN": {
    "texture": "skins",
    "x": 2858,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "AO": {
    "texture": "skins",
    "x": 1566,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "AP": {
    "texture": "skins",
    "x": 750,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "AQ": {
    "texture": "skins",
    "x": 2110,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "AR": {
    "texture": "skins",
    "x": 750,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "AS": {
    "texture": "skins",
    "x": 3402,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "AT": {
    "texture": "skins",
    "x": 2994,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "AU": {
    "texture": "skins",
    "x": 3538,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "AV": {
    "texture": "skins",
    "x": 2,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "AW": {
    "texture": "skins",
    "x": 2382,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "AX": {
    "texture": "skins",
    "x": 3402,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "AY": {
    "texture": "skins",
    "x": 1158,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "AZ": {
    "texture": "skins",
    "x": 4002,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "Aa": {
    "texture": "skins",
    "x": 2382,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "Ab": {
    "texture": "wear",
    "x": 1591,
    "y": 301,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Ac": {
    "texture": "wear",
    "x": 1147,
    "y": 140,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Ad": {
    "texture": "wear",
    "x": 634,
    "y": 602,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "Ae": {
    "texture": "wear",
    "x": 223,
    "y": 322,
    "w": 184,
    "h": 132,
    "px": 38,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Af": {
    "texture": "wear",
    "x": 1315,
    "y": 814,
    "w": 64,
    "h": 130,
    "px": 71,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "BC": {
    "texture": "skins",
    "x": 2110,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "BD": {
    "texture": "skins",
    "x": 138,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "BE": {
    "texture": "skins",
    "x": 2178,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "BF": {
    "texture": "skins",
    "x": 3606,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "BG": {
    "texture": "skins",
    "x": 3470,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "BH": {
    "texture": "skins",
    "x": 1974,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "BI": {
    "texture": "skins",
    "x": 2518,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "BJ": {
    "texture": "skins",
    "x": 1090,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "BK": {
    "texture": "skins",
    "x": 478,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "BL": {
    "texture": "skins",
    "x": 206,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "BM": {
    "texture": "skins",
    "x": 1838,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "BN": {
    "texture": "skins",
    "x": 2858,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "BO": {
    "texture": "skins",
    "x": 886,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "BP": {
    "texture": "skins",
    "x": 2450,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "BQ": {
    "texture": "skins",
    "x": 1498,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "BR": {
    "texture": "skins",
    "x": 1090,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "BS": {
    "texture": "skins",
    "x": 818,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "BT": {
    "texture": "skins",
    "x": 2042,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "BU": {
    "texture": "skins",
    "x": 1022,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "BV": {
    "texture": "skins",
    "x": 1498,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "BW": {
    "texture": "skins",
    "x": 1022,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "BX": {
    "texture": "skins",
    "x": 2790,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "BY": {
    "texture": "skins",
    "x": 886,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "BZ": {
    "texture": "skins",
    "x": 3066,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "Ba": {
    "texture": "skins",
    "x": 70,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "Bb": {
    "texture": "wear",
    "x": 1344,
    "y": 1666,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Bc": {
    "texture": "wear",
    "x": 1126,
    "y": 278,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Bd": {
    "texture": "wear",
    "x": 760,
    "y": 462,
    "w": 9,
    "h": 136,
    "px": 91.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "Be": {
    "texture": "wear",
    "x": 386,
    "y": 162,
    "w": 181,
    "h": 132,
    "px": 39.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Bf": {
    "texture": "wear",
    "x": 1251,
    "y": 976,
    "w": 64,
    "h": 130,
    "px": 71,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "CB": {
    "texture": "abilities",
    "x": 65,
    "y": 2,
    "w": 58,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "CC": {
    "texture": "skins",
    "x": 1838,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "CD": {
    "texture": "skins",
    "x": 1158,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "CE": {
    "texture": "skins",
    "x": 3674,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "CF": {
    "texture": "skins",
    "x": 2450,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "CG": {
    "texture": "skins",
    "x": 1362,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "CH": {
    "texture": "skins",
    "x": 206,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "CI": {
    "texture": "skins",
    "x": 3810,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "CJ": {
    "texture": "skins",
    "x": 3470,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "CK": {
    "texture": "skins",
    "x": 1362,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "CL": {
    "texture": "skins",
    "x": 1770,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "CM": {
    "texture": "skins",
    "x": 3674,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "CN": {
    "texture": "skins",
    "x": 1770,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "CO": {
    "texture": "skins",
    "x": 1634,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "CP": {
    "texture": "skins",
    "x": 954,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "CQ": {
    "texture": "skins",
    "x": 3538,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "CR": {
    "texture": "skins",
    "x": 1838,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "CS": {
    "texture": "skins",
    "x": 1226,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "CT": {
    "texture": "skins",
    "x": 1838,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "CU": {
    "texture": "skins",
    "x": 2858,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "CV": {
    "texture": "skins",
    "x": 3538,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "CW": {
    "texture": "skins",
    "x": 206,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "CX": {
    "texture": "skins",
    "x": 1702,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "CY": {
    "texture": "skins",
    "x": 1566,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "CZ": {
    "texture": "skins",
    "x": 3498,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "Ca": {
    "texture": "skins",
    "x": 1702,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "Cb": {
    "texture": "wear",
    "x": 1570,
    "y": 841,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Cc": {
    "texture": "wear",
    "x": 1091,
    "y": 1242,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Cd": {
    "texture": "wear",
    "x": 622,
    "y": 932,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "Ce": {
    "texture": "wear",
    "x": 779,
    "y": 462,
    "w": 97,
    "h": 174,
    "px": 7.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Cf": {
    "texture": "wear",
    "x": 1236,
    "y": 1118,
    "w": 64,
    "h": 130,
    "px": 71,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "DB": {
    "texture": "abilities",
    "x": 127,
    "y": 2,
    "w": 58,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "DC": {
    "texture": "skins",
    "x": 2926,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "DD": {
    "texture": "skins",
    "x": 3878,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "DE": {
    "texture": "skins",
    "x": 410,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "DF": {
    "texture": "skins",
    "x": 3402,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "DG": {
    "texture": "skins",
    "x": 750,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "DH": {
    "texture": "skins",
    "x": 1022,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "DI": {
    "texture": "skins",
    "x": 138,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "DJ": {
    "texture": "skins",
    "x": 818,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "DK": {
    "texture": "skins",
    "x": 2926,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "DL": {
    "texture": "skins",
    "x": 2042,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "DM": {
    "texture": "skins",
    "x": 1838,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "DN": {
    "texture": "skins",
    "x": 3742,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "DO": {
    "texture": "skins",
    "x": 2586,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "DP": {
    "texture": "skins",
    "x": 818,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "DQ": {
    "texture": "skins",
    "x": 2246,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "DR": {
    "texture": "skins",
    "x": 2110,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "DS": {
    "texture": "skins",
    "x": 1498,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "DT": {
    "texture": "skins",
    "x": 1566,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "DU": {
    "texture": "skins",
    "x": 2042,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "DV": {
    "texture": "skins",
    "x": 2586,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "DW": {
    "texture": "skins",
    "x": 546,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "DX": {
    "texture": "skins",
    "x": 342,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "DY": {
    "texture": "skins",
    "x": 1294,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "DZ": {
    "texture": "skins",
    "x": 1090,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "Da": {
    "texture": "skins",
    "x": 2450,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "Db": {
    "texture": "wear",
    "x": 1502,
    "y": 1595,
    "w": 13,
    "h": 32,
    "px": 101.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Dc": {
    "texture": "wear",
    "x": 1079,
    "y": 974,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Dd": {
    "texture": "wear",
    "x": 1533,
    "y": 1887,
    "w": 9,
    "h": 136,
    "px": 91.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "De": {
    "texture": "wear",
    "x": 880,
    "y": 1758,
    "w": 97,
    "h": 174,
    "px": 7.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Df": {
    "texture": "wear",
    "x": 1483,
    "y": 942,
    "w": 42,
    "h": 93,
    "px": 76,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "EB": {
    "texture": "abilities",
    "x": 2,
    "y": 2,
    "w": 59,
    "h": 58,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "EC": {
    "texture": "skins",
    "x": 1362,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "ED": {
    "texture": "skins",
    "x": 3894,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "EE": {
    "texture": "skins",
    "x": 3198,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "EF": {
    "texture": "skins",
    "x": 750,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "EG": {
    "texture": "skins",
    "x": 2,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "EH": {
    "texture": "skins",
    "x": 70,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "EI": {
    "texture": "skins",
    "x": 682,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "EJ": {
    "texture": "skins",
    "x": 206,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "EK": {
    "texture": "skins",
    "x": 1226,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "EL": {
    "texture": "skins",
    "x": 2110,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "EM": {
    "texture": "skins",
    "x": 2722,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "EN": {
    "texture": "skins",
    "x": 2042,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "EO": {
    "texture": "skins",
    "x": 2722,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "EP": {
    "texture": "skins",
    "x": 2790,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "EQ": {
    "texture": "skins",
    "x": 1498,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "ER": {
    "texture": "skins",
    "x": 1974,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "ES": {
    "texture": "skins",
    "x": 2,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "ET": {
    "texture": "skins",
    "x": 2314,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "EU": {
    "texture": "skins",
    "x": 1634,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "EV": {
    "texture": "skins",
    "x": 1838,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "EW": {
    "texture": "skins",
    "x": 3470,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "EX": {
    "texture": "skins",
    "x": 3130,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "EY": {
    "texture": "skins",
    "x": 70,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "EZ": {
    "texture": "skins",
    "x": 2178,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "Ea": {
    "texture": "skins",
    "x": 138,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "Eb": {
    "texture": "wear",
    "x": 1303,
    "y": 1298,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Ec": {
    "texture": "wear",
    "x": 1091,
    "y": 1108,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Ed": {
    "texture": "wear",
    "x": 479,
    "y": 1101,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "Ee": {
    "texture": "wear",
    "x": 779,
    "y": 640,
    "w": 97,
    "h": 174,
    "px": 7.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Ef": {
    "texture": "wear",
    "x": 2,
    "y": 1071,
    "w": 171,
    "h": 162,
    "px": 51.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "FB": {
    "texture": "abilities",
    "x": 65,
    "y": 64,
    "w": 58,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "FC": {
    "texture": "skins",
    "x": 2382,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "FD": {
    "texture": "skins",
    "x": 750,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "FE": {
    "texture": "skins",
    "x": 1770,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "FF": {
    "texture": "skins",
    "x": 2858,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "FG": {
    "texture": "skins",
    "x": 2110,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "FH": {
    "texture": "skins",
    "x": 546,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "FI": {
    "texture": "skins",
    "x": 1566,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "FJ": {
    "texture": "skins",
    "x": 2,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "FK": {
    "texture": "skins",
    "x": 1634,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "FL": {
    "texture": "skins",
    "x": 2382,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "FM": {
    "texture": "skins",
    "x": 1906,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "FN": {
    "texture": "skins",
    "x": 3742,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "FO": {
    "texture": "skins",
    "x": 1090,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "FP": {
    "texture": "skins",
    "x": 818,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "FQ": {
    "texture": "skins",
    "x": 3606,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "FR": {
    "texture": "skins",
    "x": 3130,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "FS": {
    "texture": "skins",
    "x": 138,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "FT": {
    "texture": "skins",
    "x": 3130,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "FU": {
    "texture": "skins",
    "x": 3946,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "FV": {
    "texture": "skins",
    "x": 1702,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "FW": {
    "texture": "skins",
    "x": 2450,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "FX": {
    "texture": "skins",
    "x": 1430,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "FY": {
    "texture": "skins",
    "x": 2382,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "FZ": {
    "texture": "skins",
    "x": 682,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "Fa": {
    "texture": "skins",
    "x": 2654,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "Fb": {
    "texture": "wear",
    "x": 963,
    "y": 1936,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Fc": {
    "texture": "wear",
    "x": 1054,
    "y": 840,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Fd": {
    "texture": "wear",
    "x": 650,
    "y": 311,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "Fe": {
    "texture": "wear",
    "x": 336,
    "y": 458,
    "w": 158,
    "h": 141,
    "px": 19,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "Ff": {
    "texture": "wear",
    "x": 2,
    "y": 238,
    "w": 217,
    "h": 232,
    "px": 22.5,
    "py": 71,
    "pw": 128,
    "ph": 128
  },
  "GB": {
    "texture": "abilities",
    "x": 189,
    "y": 64,
    "w": 58,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "GC": {
    "texture": "skins",
    "x": 3066,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "GD": {
    "texture": "skins",
    "x": 1430,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "GE": {
    "texture": "skins",
    "x": 3062,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "GF": {
    "texture": "skins",
    "x": 3266,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "GG": {
    "texture": "skins",
    "x": 2246,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "GH": {
    "texture": "skins",
    "x": 2110,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "GI": {
    "texture": "skins",
    "x": 70,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "GJ": {
    "texture": "skins",
    "x": 2586,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "GK": {
    "texture": "skins",
    "x": 2178,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "GL": {
    "texture": "skins",
    "x": 3266,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "GM": {
    "texture": "skins",
    "x": 4014,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "GN": {
    "texture": "skins",
    "x": 3062,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "GO": {
    "texture": "skins",
    "x": 2586,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "GP": {
    "texture": "skins",
    "x": 3402,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "GQ": {
    "texture": "skins",
    "x": 1362,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "GR": {
    "texture": "skins",
    "x": 682,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "GS": {
    "texture": "skins",
    "x": 2450,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "GT": {
    "texture": "skins",
    "x": 4014,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "GU": {
    "texture": "skins",
    "x": 1294,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "GV": {
    "texture": "skins",
    "x": 3810,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "GW": {
    "texture": "skins",
    "x": 3266,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "GX": {
    "texture": "skins",
    "x": 2654,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "GY": {
    "texture": "skins",
    "x": 2110,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "GZ": {
    "texture": "skins",
    "x": 1362,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "Ga": {
    "texture": "skins",
    "x": 2722,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "Gb": {
    "texture": "wear",
    "x": 1002,
    "y": 1378,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Gc": {
    "texture": "wear",
    "x": 1052,
    "y": 706,
    "w": 80,
    "h": 130,
    "px": 105,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Gd": {
    "texture": "wear",
    "x": 747,
    "y": 462,
    "w": 9,
    "h": 136,
    "px": 91.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "Ge": {
    "texture": "wear",
    "x": 314,
    "y": 804,
    "w": 158,
    "h": 141,
    "px": 19,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "Gf": {
    "texture": "wear",
    "x": 2,
    "y": 2,
    "w": 217,
    "h": 232,
    "px": 22.5,
    "py": 71,
    "pw": 128,
    "ph": 128
  },
  "HB": {
    "texture": "abilities",
    "x": 127,
    "y": 64,
    "w": 58,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "HC": {
    "texture": "skins",
    "x": 342,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "HD": {
    "texture": "skins",
    "x": 342,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "HE": {
    "texture": "skins",
    "x": 1294,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "HF": {
    "texture": "skins",
    "x": 1906,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "HG": {
    "texture": "skins",
    "x": 1158,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "HH": {
    "texture": "skins",
    "x": 2178,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "HI": {
    "texture": "skins",
    "x": 546,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "HJ": {
    "texture": "skins",
    "x": 2994,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "HK": {
    "texture": "skins",
    "x": 2110,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "HL": {
    "texture": "skins",
    "x": 2246,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "HM": {
    "texture": "skins",
    "x": 2790,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "HN": {
    "texture": "skins",
    "x": 750,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "HO": {
    "texture": "skins",
    "x": 2586,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "HP": {
    "texture": "skins",
    "x": 1838,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "HQ": {
    "texture": "skins",
    "x": 954,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "HR": {
    "texture": "skins",
    "x": 3810,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "HS": {
    "texture": "skins",
    "x": 1770,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "HT": {
    "texture": "skins",
    "x": 1022,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "HU": {
    "texture": "skins",
    "x": 274,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "HV": {
    "texture": "skins",
    "x": 1158,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "HW": {
    "texture": "skins",
    "x": 2722,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "HX": {
    "texture": "skins",
    "x": 274,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "HY": {
    "texture": "skins",
    "x": 2,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "HZ": {
    "texture": "skins",
    "x": 2178,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "Ha": {
    "texture": "skins",
    "x": 546,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "Hb": {
    "texture": "wear",
    "x": 963,
    "y": 1647,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Hc": {
    "texture": "wear",
    "x": 1216,
    "y": 2,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Hd": {
    "texture": "wear",
    "x": 628,
    "y": 755,
    "w": 141,
    "h": 147,
    "px": 62.5,
    "py": 66.5,
    "pw": 128,
    "ph": 128
  },
  "He": {
    "texture": "wear",
    "x": 320,
    "y": 635,
    "w": 158,
    "h": 141,
    "px": 19,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "IB": {
    "texture": "abilities",
    "x": 2,
    "y": 64,
    "w": 59,
    "h": 58,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "IC": {
    "texture": "skins",
    "x": 138,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "ID": {
    "texture": "skins",
    "x": 478,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "IE": {
    "texture": "skins",
    "x": 1838,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "IF": {
    "texture": "skins",
    "x": 70,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "IG": {
    "texture": "skins",
    "x": 2654,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "IH": {
    "texture": "skins",
    "x": 1906,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "II": {
    "texture": "skins",
    "x": 138,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "IJ": {
    "texture": "skins",
    "x": 1362,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "IK": {
    "texture": "skins",
    "x": 3538,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "IL": {
    "texture": "skins",
    "x": 138,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "IM": {
    "texture": "skins",
    "x": 1702,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "IN": {
    "texture": "skins",
    "x": 2790,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "IO": {
    "texture": "skins",
    "x": 1158,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "IP": {
    "texture": "skins",
    "x": 410,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "IQ": {
    "texture": "skins",
    "x": 1974,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "IR": {
    "texture": "skins",
    "x": 3130,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "IS": {
    "texture": "skins",
    "x": 2,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "IT": {
    "texture": "skins",
    "x": 1226,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "IU": {
    "texture": "skins",
    "x": 70,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "IV": {
    "texture": "skins",
    "x": 1838,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "IW": {
    "texture": "skins",
    "x": 3878,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "IX": {
    "texture": "skins",
    "x": 1022,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "IY": {
    "texture": "skins",
    "x": 3822,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "IZ": {
    "texture": "skins",
    "x": 2654,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "Ia": {
    "texture": "skins",
    "x": 614,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "Ib": {
    "texture": "wear",
    "x": 249,
    "y": 1933,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Ic": {
    "texture": "wear",
    "x": 1312,
    "y": 134,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Id": {
    "texture": "wear",
    "x": 1131,
    "y": 1654,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Ie": {
    "texture": "wear",
    "x": 165,
    "y": 1237,
    "w": 158,
    "h": 141,
    "px": 19,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "JB": {
    "texture": "skins",
    "x": 2722,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "JC": {
    "texture": "skins",
    "x": 2314,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "JD": {
    "texture": "skins",
    "x": 2722,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "JE": {
    "texture": "skins",
    "x": 2722,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "JF": {
    "texture": "skins",
    "x": 1906,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "JG": {
    "texture": "skins",
    "x": 682,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "JH": {
    "texture": "skins",
    "x": 546,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "JI": {
    "texture": "skins",
    "x": 3858,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "JJ": {
    "texture": "skins",
    "x": 2042,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "JK": {
    "texture": "skins",
    "x": 1158,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "JL": {
    "texture": "skins",
    "x": 954,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "JM": {
    "texture": "skins",
    "x": 274,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "JN": {
    "texture": "skins",
    "x": 886,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "JO": {
    "texture": "skins",
    "x": 2858,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "JP": {
    "texture": "skins",
    "x": 2246,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "JQ": {
    "texture": "skins",
    "x": 1702,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "JR": {
    "texture": "skins",
    "x": 3878,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "JS": {
    "texture": "skins",
    "x": 342,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "JT": {
    "texture": "skins",
    "x": 2450,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "JU": {
    "texture": "skins",
    "x": 1906,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "JV": {
    "texture": "skins",
    "x": 1974,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "JW": {
    "texture": "skins",
    "x": 2858,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "JX": {
    "texture": "skins",
    "x": 614,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "JY": {
    "texture": "skins",
    "x": 4002,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "JZ": {
    "texture": "skins",
    "x": 2,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "Ja": {
    "texture": "skins",
    "x": 2450,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "Jb": {
    "texture": "wear",
    "x": 870,
    "y": 964,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Jc": {
    "texture": "wear",
    "x": 1291,
    "y": 266,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Jd": {
    "texture": "wear",
    "x": 1510,
    "y": 134,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "Je": {
    "texture": "wear",
    "x": 569,
    "y": 2,
    "w": 158,
    "h": 141,
    "px": 19,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "KB": {
    "texture": "skins",
    "x": 3210,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "KC": {
    "texture": "skins",
    "x": 3878,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "KD": {
    "texture": "skins",
    "x": 3674,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "KE": {
    "texture": "skins",
    "x": 1566,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "KF": {
    "texture": "skins",
    "x": 1022,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "KG": {
    "texture": "skins",
    "x": 1634,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "KH": {
    "texture": "skins",
    "x": 3266,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "KI": {
    "texture": "skins",
    "x": 1294,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "KJ": {
    "texture": "skins",
    "x": 886,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "KK": {
    "texture": "skins",
    "x": 70,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "KL": {
    "texture": "skins",
    "x": 1566,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "KM": {
    "texture": "skins",
    "x": 818,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "KN": {
    "texture": "skins",
    "x": 2246,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "KO": {
    "texture": "skins",
    "x": 70,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "KP": {
    "texture": "skins",
    "x": 2654,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "KQ": {
    "texture": "skins",
    "x": 1770,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "KR": {
    "texture": "skins",
    "x": 2382,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "KS": {
    "texture": "skins",
    "x": 2,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "KT": {
    "texture": "skins",
    "x": 206,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "KU": {
    "texture": "skins",
    "x": 2790,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "KV": {
    "texture": "skins",
    "x": 2382,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "KW": {
    "texture": "skins",
    "x": 3266,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "KX": {
    "texture": "skins",
    "x": 2722,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "KY": {
    "texture": "skins",
    "x": 3966,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "KZ": {
    "texture": "skins",
    "x": 478,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "Ka": {
    "texture": "skins",
    "x": 1770,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "Kb": {
    "texture": "wear",
    "x": 898,
    "y": 1506,
    "w": 12,
    "h": 72,
    "px": 104,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Kc": {
    "texture": "wear",
    "x": 1297,
    "y": 2,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Kd": {
    "texture": "wear",
    "x": 1486,
    "y": 544,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "Ke": {
    "texture": "wear",
    "x": 308,
    "y": 978,
    "w": 158,
    "h": 141,
    "px": 19,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "L": {
    "texture": "portions",
    "x": 2,
    "y": 69,
    "w": 62,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "LB": {
    "texture": "skins",
    "x": 274,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "LC": {
    "texture": "skins",
    "x": 3062,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "LD": {
    "texture": "skins",
    "x": 1362,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "LE": {
    "texture": "skins",
    "x": 2382,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "LF": {
    "texture": "skins",
    "x": 1226,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "LG": {
    "texture": "skins",
    "x": 2926,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "LH": {
    "texture": "skins",
    "x": 614,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "LI": {
    "texture": "skins",
    "x": 206,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "LJ": {
    "texture": "skins",
    "x": 2858,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "LK": {
    "texture": "skins",
    "x": 614,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "LL": {
    "texture": "skins",
    "x": 206,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "LM": {
    "texture": "skins",
    "x": 3810,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "LN": {
    "texture": "skins",
    "x": 3822,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "LO": {
    "texture": "skins",
    "x": 3946,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "LP": {
    "texture": "skins",
    "x": 70,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "LQ": {
    "texture": "skins",
    "x": 1090,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "LR": {
    "texture": "skins",
    "x": 3470,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "LS": {
    "texture": "skins",
    "x": 2178,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "LT": {
    "texture": "skins",
    "x": 1362,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "LU": {
    "texture": "skins",
    "x": 2382,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "LV": {
    "texture": "skins",
    "x": 206,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "LW": {
    "texture": "skins",
    "x": 2518,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "LX": {
    "texture": "skins",
    "x": 1158,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "LY": {
    "texture": "skins",
    "x": 3174,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "LZ": {
    "texture": "skins",
    "x": 2790,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "La": {
    "texture": "skins",
    "x": 70,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "Lb": {
    "texture": "wear",
    "x": 312,
    "y": 1123,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Lc": {
    "texture": "wear",
    "x": 1231,
    "y": 134,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Ld": {
    "texture": "wear",
    "x": 1185,
    "y": 1270,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Le": {
    "texture": "wear",
    "x": 650,
    "y": 462,
    "w": 93,
    "h": 130,
    "px": 17.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "M": {
    "texture": "portions",
    "x": 447,
    "y": 187,
    "w": 63,
    "h": 47,
    "px": 31.5,
    "py": 30.5,
    "pw": 64,
    "ph": 64
  },
  "MB": {
    "texture": "skins",
    "x": 3498,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "MC": {
    "texture": "skins",
    "x": 1566,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "MD": {
    "texture": "skins",
    "x": 2110,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "ME": {
    "texture": "skins",
    "x": 410,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "MF": {
    "texture": "skins",
    "x": 886,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "MG": {
    "texture": "skins",
    "x": 2450,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "MH": {
    "texture": "skins",
    "x": 1906,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "MI": {
    "texture": "skins",
    "x": 1362,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "MJ": {
    "texture": "skins",
    "x": 1090,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "MK": {
    "texture": "skins",
    "x": 342,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "ML": {
    "texture": "skins",
    "x": 410,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "MM": {
    "texture": "skins",
    "x": 614,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "MN": {
    "texture": "skins",
    "x": 1566,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "MO": {
    "texture": "skins",
    "x": 2722,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "MP": {
    "texture": "skins",
    "x": 3334,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "MQ": {
    "texture": "skins",
    "x": 2042,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "MR": {
    "texture": "skins",
    "x": 1226,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "MS": {
    "texture": "skins",
    "x": 2382,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "MT": {
    "texture": "skins",
    "x": 1022,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "MU": {
    "texture": "skins",
    "x": 1294,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "MV": {
    "texture": "skins",
    "x": 2,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "MW": {
    "texture": "skins",
    "x": 3674,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "MX": {
    "texture": "skins",
    "x": 3606,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "MY": {
    "texture": "skins",
    "x": 274,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "MZ": {
    "texture": "skins",
    "x": 2654,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "Ma": {
    "texture": "skins",
    "x": 3402,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "Mb": {
    "texture": "wear",
    "x": 1002,
    "y": 1454,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Mc": {
    "texture": "wear",
    "x": 1278,
    "y": 406,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Md": {
    "texture": "wear",
    "x": 1052,
    "y": 1958,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "Me": {
    "texture": "wear",
    "x": 1020,
    "y": 1516,
    "w": 40,
    "h": 122,
    "px": 20,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "N": {
    "texture": "portions",
    "x": 380,
    "y": 187,
    "w": 63,
    "h": 47,
    "px": 32.5,
    "py": 30.5,
    "pw": 64,
    "ph": 64
  },
  "NB": {
    "texture": "skins",
    "x": 2518,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "NC": {
    "texture": "skins",
    "x": 138,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "ND": {
    "texture": "skins",
    "x": 2858,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "NE": {
    "texture": "skins",
    "x": 2450,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "NF": {
    "texture": "skins",
    "x": 2314,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "NG": {
    "texture": "skins",
    "x": 1838,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "NH": {
    "texture": "skins",
    "x": 1226,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "NI": {
    "texture": "skins",
    "x": 138,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "NJ": {
    "texture": "skins",
    "x": 206,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "NK": {
    "texture": "skins",
    "x": 1158,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "NL": {
    "texture": "skins",
    "x": 2,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "NM": {
    "texture": "skins",
    "x": 2042,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "NN": {
    "texture": "skins",
    "x": 342,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "NO": {
    "texture": "skins",
    "x": 3334,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "NP": {
    "texture": "skins",
    "x": 3742,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "NQ": {
    "texture": "skins",
    "x": 1430,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "NR": {
    "texture": "skins",
    "x": 886,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "NS": {
    "texture": "skins",
    "x": 2790,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "NT": {
    "texture": "skins",
    "x": 954,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "NU": {
    "texture": "skins",
    "x": 2518,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "NV": {
    "texture": "skins",
    "x": 410,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "NW": {
    "texture": "skins",
    "x": 886,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "NX": {
    "texture": "skins",
    "x": 3198,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "NY": {
    "texture": "skins",
    "x": 2314,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "NZ": {
    "texture": "skins",
    "x": 3674,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "Na": {
    "texture": "skins",
    "x": 3786,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "Nb": {
    "texture": "wear",
    "x": 312,
    "y": 1167,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Nc": {
    "texture": "wear",
    "x": 1210,
    "y": 274,
    "w": 77,
    "h": 128,
    "px": 111.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Nd": {
    "texture": "wear",
    "x": 1376,
    "y": 1348,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "Ne": {
    "texture": "wear",
    "x": 1547,
    "y": 260,
    "w": 40,
    "h": 122,
    "px": 20,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "O": {
    "texture": "portions",
    "x": 253,
    "y": 192,
    "w": 63,
    "h": 47,
    "px": 32.5,
    "py": 30.5,
    "pw": 64,
    "ph": 64
  },
  "OB": {
    "texture": "skins",
    "x": 3678,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "OC": {
    "texture": "skins",
    "x": 138,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "OD": {
    "texture": "skins",
    "x": 1566,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "OE": {
    "texture": "skins",
    "x": 1498,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "OF": {
    "texture": "skins",
    "x": 954,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "OG": {
    "texture": "skins",
    "x": 1362,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "OH": {
    "texture": "skins",
    "x": 3606,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "OI": {
    "texture": "skins",
    "x": 886,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "OJ": {
    "texture": "skins",
    "x": 1158,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "OK": {
    "texture": "skins",
    "x": 1906,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "OL": {
    "texture": "skins",
    "x": 70,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "OM": {
    "texture": "skins",
    "x": 3678,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "ON": {
    "texture": "skins",
    "x": 1090,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "OO": {
    "texture": "skins",
    "x": 2450,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "OP": {
    "texture": "skins",
    "x": 3538,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "OQ": {
    "texture": "skins",
    "x": 818,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "OR": {
    "texture": "skins",
    "x": 3538,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "OS": {
    "texture": "skins",
    "x": 2450,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "OT": {
    "texture": "skins",
    "x": 1090,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "OU": {
    "texture": "skins",
    "x": 2926,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "OV": {
    "texture": "skins",
    "x": 1634,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "OW": {
    "texture": "skins",
    "x": 1770,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "OX": {
    "texture": "skins",
    "x": 2042,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "OY": {
    "texture": "skins",
    "x": 2858,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "OZ": {
    "texture": "skins",
    "x": 70,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "Oa": {
    "texture": "skins",
    "x": 3606,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "Ob": {
    "texture": "wear",
    "x": 516,
    "y": 1483,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Oc": {
    "texture": "wear",
    "x": 1192,
    "y": 1925,
    "w": 63,
    "h": 104,
    "px": 132.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Od": {
    "texture": "wear",
    "x": 1175,
    "y": 1118,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Oe": {
    "texture": "wear",
    "x": 1535,
    "y": 392,
    "w": 40,
    "h": 122,
    "px": 20,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "P": {
    "texture": "portions",
    "x": 200,
    "y": 66,
    "w": 58,
    "h": 62,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "PB": {
    "texture": "skins",
    "x": 682,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "PC": {
    "texture": "skins",
    "x": 1566,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "PD": {
    "texture": "skins",
    "x": 2,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "PE": {
    "texture": "skins",
    "x": 3198,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "PF": {
    "texture": "skins",
    "x": 1974,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "PG": {
    "texture": "skins",
    "x": 2042,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "PH": {
    "texture": "skins",
    "x": 342,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "PI": {
    "texture": "skins",
    "x": 2246,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "PJ": {
    "texture": "skins",
    "x": 3470,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "PK": {
    "texture": "skins",
    "x": 3878,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "PL": {
    "texture": "skins",
    "x": 1634,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "PM": {
    "texture": "skins",
    "x": 3742,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "PN": {
    "texture": "skins",
    "x": 818,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "PO": {
    "texture": "skins",
    "x": 2518,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "PP": {
    "texture": "skins",
    "x": 1634,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "PQ": {
    "texture": "skins",
    "x": 3810,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "PR": {
    "texture": "skins",
    "x": 2654,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "PS": {
    "texture": "skins",
    "x": 4014,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "PT": {
    "texture": "skins",
    "x": 2382,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "PU": {
    "texture": "skins",
    "x": 2654,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "PV": {
    "texture": "skins",
    "x": 1634,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "PW": {
    "texture": "skins",
    "x": 410,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "PX": {
    "texture": "skins",
    "x": 1974,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "PY": {
    "texture": "skins",
    "x": 1566,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "PZ": {
    "texture": "skins",
    "x": 614,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "Pa": {
    "texture": "skins",
    "x": 3714,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "Pb": {
    "texture": "wear",
    "x": 1487,
    "y": 1495,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Pc": {
    "texture": "wear",
    "x": 136,
    "y": 1933,
    "w": 63,
    "h": 104,
    "px": 132.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Pd": {
    "texture": "wear",
    "x": 1510,
    "y": 197,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "Pe": {
    "texture": "wear",
    "x": 870,
    "y": 818,
    "w": 96,
    "h": 142,
    "px": 18,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Q": {
    "texture": "portions",
    "x": 2,
    "y": 131,
    "w": 58,
    "h": 62,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "QB": {
    "texture": "skins",
    "x": 3822,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "QC": {
    "texture": "skins",
    "x": 954,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "QD": {
    "texture": "skins",
    "x": 954,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "QE": {
    "texture": "skins",
    "x": 750,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "QF": {
    "texture": "skins",
    "x": 2246,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "QG": {
    "texture": "skins",
    "x": 1090,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "QH": {
    "texture": "skins",
    "x": 3946,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "QI": {
    "texture": "skins",
    "x": 2,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "QJ": {
    "texture": "skins",
    "x": 1294,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "QK": {
    "texture": "skins",
    "x": 1090,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "QL": {
    "texture": "skins",
    "x": 1634,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "QM": {
    "texture": "skins",
    "x": 410,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "QN": {
    "texture": "skins",
    "x": 2042,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "QO": {
    "texture": "skins",
    "x": 1770,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "QP": {
    "texture": "skins",
    "x": 2314,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "QQ": {
    "texture": "skins",
    "x": 1226,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "QR": {
    "texture": "skins",
    "x": 3674,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "QS": {
    "texture": "skins",
    "x": 1158,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "QT": {
    "texture": "skins",
    "x": 2178,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "QU": {
    "texture": "skins",
    "x": 1226,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "QV": {
    "texture": "skins",
    "x": 2926,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "QW": {
    "texture": "skins",
    "x": 614,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "QX": {
    "texture": "skins",
    "x": 1294,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "QY": {
    "texture": "skins",
    "x": 546,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "QZ": {
    "texture": "skins",
    "x": 2246,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "Qa": {
    "texture": "skins",
    "x": 3606,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "Qb": {
    "texture": "wear",
    "x": 1537,
    "y": 1547,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Qc": {
    "texture": "wear",
    "x": 1372,
    "y": 278,
    "w": 63,
    "h": 104,
    "px": 132.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Qd": {
    "texture": "wear",
    "x": 773,
    "y": 818,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "Qe": {
    "texture": "wear",
    "x": 2,
    "y": 1397,
    "w": 114,
    "h": 214,
    "px": 8,
    "py": 74,
    "pw": 128,
    "ph": 128
  },
  "R": {
    "texture": "portions",
    "x": 326,
    "y": 2,
    "w": 58,
    "h": 62,
    "px": 31,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "RB": {
    "texture": "skins",
    "x": 1498,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "RC": {
    "texture": "skins",
    "x": 1634,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "RD": {
    "texture": "skins",
    "x": 1158,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "RE": {
    "texture": "skins",
    "x": 1226,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "RF": {
    "texture": "skins",
    "x": 342,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "RG": {
    "texture": "skins",
    "x": 818,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "RH": {
    "texture": "skins",
    "x": 1634,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "RI": {
    "texture": "skins",
    "x": 70,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "RJ": {
    "texture": "skins",
    "x": 2790,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "RK": {
    "texture": "skins",
    "x": 1770,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "RL": {
    "texture": "skins",
    "x": 1498,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "RM": {
    "texture": "skins",
    "x": 2722,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "RN": {
    "texture": "skins",
    "x": 1090,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "RO": {
    "texture": "skins",
    "x": 2246,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "RP": {
    "texture": "skins",
    "x": 1974,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "RQ": {
    "texture": "skins",
    "x": 1634,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "RR": {
    "texture": "skins",
    "x": 2518,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "RS": {
    "texture": "skins",
    "x": 2246,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "RT": {
    "texture": "skins",
    "x": 2654,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "RU": {
    "texture": "skins",
    "x": 2246,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "RV": {
    "texture": "skins",
    "x": 478,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "RW": {
    "texture": "skins",
    "x": 1634,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "RX": {
    "texture": "skins",
    "x": 2382,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "RY": {
    "texture": "skins",
    "x": 2858,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "RZ": {
    "texture": "skins",
    "x": 954,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "Ra": {
    "texture": "skins",
    "x": 3570,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "Rb": {
    "texture": "wear",
    "x": 516,
    "y": 1439,
    "w": 11,
    "h": 40,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Rc": {
    "texture": "wear",
    "x": 1459,
    "y": 1495,
    "w": 24,
    "h": 51,
    "px": 113,
    "py": 62.5,
    "pw": 128,
    "ph": 128
  },
  "Rd": {
    "texture": "wear",
    "x": 1393,
    "y": 126,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Re": {
    "texture": "wear",
    "x": 327,
    "y": 1275,
    "w": 76,
    "h": 88,
    "px": 7,
    "py": 139,
    "pw": 128,
    "ph": 128
  },
  "S": {
    "texture": "portions",
    "x": 2,
    "y": 431,
    "w": 62,
    "h": 33,
    "px": 32,
    "py": 30.5,
    "pw": 64,
    "ph": 64
  },
  "SB": {
    "texture": "skins",
    "x": 3282,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "SC": {
    "texture": "skins",
    "x": 2518,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "SD": {
    "texture": "skins",
    "x": 1158,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "SE": {
    "texture": "skins",
    "x": 3266,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "SF": {
    "texture": "skins",
    "x": 3318,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "SG": {
    "texture": "skins",
    "x": 3674,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "SH": {
    "texture": "skins",
    "x": 3266,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "SI": {
    "texture": "skins",
    "x": 2790,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "SJ": {
    "texture": "skins",
    "x": 2858,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "SK": {
    "texture": "skins",
    "x": 1022,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "SL": {
    "texture": "skins",
    "x": 1158,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "SM": {
    "texture": "skins",
    "x": 614,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "SN": {
    "texture": "skins",
    "x": 2450,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "SO": {
    "texture": "skins",
    "x": 1906,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "SP": {
    "texture": "skins",
    "x": 2382,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "SQ": {
    "texture": "skins",
    "x": 750,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "SR": {
    "texture": "skins",
    "x": 1362,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "SS": {
    "texture": "skins",
    "x": 818,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "ST": {
    "texture": "skins",
    "x": 2586,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "SU": {
    "texture": "skins",
    "x": 2722,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "SV": {
    "texture": "skins",
    "x": 1974,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "SW": {
    "texture": "skins",
    "x": 1294,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "SX": {
    "texture": "skins",
    "x": 1362,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "SY": {
    "texture": "skins",
    "x": 70,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "SZ": {
    "texture": "skins",
    "x": 2586,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "Sa": {
    "texture": "skins",
    "x": 3462,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "Sb": {
    "texture": "wear",
    "x": 657,
    "y": 1592,
    "w": 10,
    "h": 12,
    "px": 119,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Sc": {
    "texture": "wear",
    "x": 1463,
    "y": 1735,
    "w": 24,
    "h": 52,
    "px": 108,
    "py": 60,
    "pw": 128,
    "ph": 128
  },
  "Sd": {
    "texture": "wear",
    "x": 177,
    "y": 1158,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "Se": {
    "texture": "wear",
    "x": 880,
    "y": 1936,
    "w": 79,
    "h": 92,
    "px": 5.5,
    "py": -13,
    "pw": 128,
    "ph": 128
  },
  "T": {
    "texture": "portions",
    "x": 264,
    "y": 2,
    "w": 58,
    "h": 62,
    "px": 31,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "TB": {
    "texture": "skins",
    "x": 274,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "TC": {
    "texture": "skins",
    "x": 138,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "TD": {
    "texture": "skins",
    "x": 818,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "TE": {
    "texture": "skins",
    "x": 614,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "TF": {
    "texture": "skins",
    "x": 1498,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "TG": {
    "texture": "skins",
    "x": 614,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "TH": {
    "texture": "skins",
    "x": 3130,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "TI": {
    "texture": "skins",
    "x": 818,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "TJ": {
    "texture": "skins",
    "x": 3402,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "TK": {
    "texture": "skins",
    "x": 1838,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "TL": {
    "texture": "skins",
    "x": 2926,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "TM": {
    "texture": "skins",
    "x": 410,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "TN": {
    "texture": "skins",
    "x": 2246,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "TO": {
    "texture": "skins",
    "x": 3198,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "TP": {
    "texture": "skins",
    "x": 274,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "TQ": {
    "texture": "skins",
    "x": 1702,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "TR": {
    "texture": "skins",
    "x": 478,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "TS": {
    "texture": "skins",
    "x": 2,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "TT": {
    "texture": "skins",
    "x": 2110,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "TU": {
    "texture": "skins",
    "x": 138,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "TV": {
    "texture": "skins",
    "x": 1226,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "TW": {
    "texture": "skins",
    "x": 1974,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "TX": {
    "texture": "skins",
    "x": 1226,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "TY": {
    "texture": "skins",
    "x": 1974,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "TZ": {
    "texture": "skins",
    "x": 2586,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "Ta": {
    "texture": "skins",
    "x": 3930,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "Tb": {
    "texture": "wear",
    "x": 1528,
    "y": 1735,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Tc": {
    "texture": "wear",
    "x": 1449,
    "y": 1800,
    "w": 40,
    "h": 88,
    "px": 115,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "Td": {
    "texture": "wear",
    "x": 1559,
    "y": 2,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "Te": {
    "texture": "wear",
    "x": 409,
    "y": 1439,
    "w": 76,
    "h": 88,
    "px": 7,
    "py": 139,
    "pw": 128,
    "ph": 128
  },
  "U": {
    "texture": "portions",
    "x": 320,
    "y": 238,
    "w": 61,
    "h": 46,
    "px": 32.5,
    "py": 34,
    "pw": 64,
    "ph": 64
  },
  "UB": {
    "texture": "skins",
    "x": 3534,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "UC": {
    "texture": "skins",
    "x": 546,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "UD": {
    "texture": "skins",
    "x": 954,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "UE": {
    "texture": "skins",
    "x": 138,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "UF": {
    "texture": "skins",
    "x": 342,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "UG": {
    "texture": "skins",
    "x": 2926,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "UH": {
    "texture": "skins",
    "x": 1498,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "UI": {
    "texture": "skins",
    "x": 2450,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "UJ": {
    "texture": "skins",
    "x": 750,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "UK": {
    "texture": "skins",
    "x": 1906,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "UL": {
    "texture": "skins",
    "x": 1294,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "UM": {
    "texture": "skins",
    "x": 2,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "UN": {
    "texture": "skins",
    "x": 3198,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "UO": {
    "texture": "skins",
    "x": 2518,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "UP": {
    "texture": "skins",
    "x": 546,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "UQ": {
    "texture": "skins",
    "x": 2246,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "UR": {
    "texture": "skins",
    "x": 2314,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "US": {
    "texture": "skins",
    "x": 3470,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "UT": {
    "texture": "skins",
    "x": 2586,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "UU": {
    "texture": "skins",
    "x": 2314,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "UV": {
    "texture": "skins",
    "x": 2586,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "UW": {
    "texture": "skins",
    "x": 2722,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "UX": {
    "texture": "skins",
    "x": 410,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "UY": {
    "texture": "skins",
    "x": 546,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "UZ": {
    "texture": "skins",
    "x": 3266,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "Ua": {
    "texture": "skins",
    "x": 3390,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "Ub": {
    "texture": "wear",
    "x": 1463,
    "y": 1635,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Uc": {
    "texture": "wear",
    "x": 1537,
    "y": 1491,
    "w": 23,
    "h": 52,
    "px": 109.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "Ud": {
    "texture": "wear",
    "x": 1070,
    "y": 1654,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Ue": {
    "texture": "wear",
    "x": 658,
    "y": 1949,
    "w": 79,
    "h": 92,
    "px": 5.5,
    "py": -13,
    "pw": 128,
    "ph": 128
  },
  "V": {
    "texture": "portions",
    "x": 246,
    "y": 243,
    "w": 61,
    "h": 46,
    "px": 31.5,
    "py": 34,
    "pw": 64,
    "ph": 64
  },
  "VB": {
    "texture": "skins",
    "x": 2586,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "VC": {
    "texture": "skins",
    "x": 2518,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "VD": {
    "texture": "skins",
    "x": 886,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "VE": {
    "texture": "skins",
    "x": 3062,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "VF": {
    "texture": "skins",
    "x": 206,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "VG": {
    "texture": "skins",
    "x": 1498,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "VH": {
    "texture": "skins",
    "x": 2450,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "VI": {
    "texture": "skins",
    "x": 1226,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "VJ": {
    "texture": "skins",
    "x": 2382,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "VK": {
    "texture": "skins",
    "x": 3266,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "VL": {
    "texture": "skins",
    "x": 2042,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "VM": {
    "texture": "skins",
    "x": 1498,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "VN": {
    "texture": "skins",
    "x": 3674,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "VO": {
    "texture": "skins",
    "x": 1498,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "VP": {
    "texture": "skins",
    "x": 1158,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "VQ": {
    "texture": "skins",
    "x": 1702,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "VR": {
    "texture": "skins",
    "x": 1906,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "VS": {
    "texture": "skins",
    "x": 546,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "VT": {
    "texture": "skins",
    "x": 1158,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "VU": {
    "texture": "skins",
    "x": 206,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "VV": {
    "texture": "skins",
    "x": 1498,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "VW": {
    "texture": "skins",
    "x": 2178,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "VX": {
    "texture": "skins",
    "x": 1498,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "VY": {
    "texture": "skins",
    "x": 1022,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "VZ": {
    "texture": "skins",
    "x": 2518,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "Va": {
    "texture": "wear",
    "x": 1459,
    "y": 1411,
    "w": 42,
    "h": 80,
    "px": 75,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Vb": {
    "texture": "wear",
    "x": 1493,
    "y": 1735,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Vc": {
    "texture": "wear",
    "x": 1138,
    "y": 838,
    "w": 20,
    "h": 70,
    "px": 108,
    "py": 61,
    "pw": 128,
    "ph": 128
  },
  "Vd": {
    "texture": "wear",
    "x": 880,
    "y": 735,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "Ve": {
    "texture": "wear",
    "x": 731,
    "y": 2,
    "w": 146,
    "h": 134,
    "px": 36,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "W": {
    "texture": "portions",
    "x": 180,
    "y": 253,
    "w": 61,
    "h": 46,
    "px": 32.5,
    "py": 34,
    "pw": 64,
    "ph": 64
  },
  "WB": {
    "texture": "skins",
    "x": 3946,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "WC": {
    "texture": "skins",
    "x": 2586,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "WD": {
    "texture": "skins",
    "x": 2790,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "WE": {
    "texture": "skins",
    "x": 1294,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "WF": {
    "texture": "skins",
    "x": 750,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "WG": {
    "texture": "skins",
    "x": 2518,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "WH": {
    "texture": "skins",
    "x": 818,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "WI": {
    "texture": "skins",
    "x": 274,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "WJ": {
    "texture": "skins",
    "x": 1022,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "WK": {
    "texture": "skins",
    "x": 2178,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "WL": {
    "texture": "skins",
    "x": 206,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "WM": {
    "texture": "skins",
    "x": 2858,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "WN": {
    "texture": "skins",
    "x": 1498,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "WO": {
    "texture": "skins",
    "x": 2110,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "WP": {
    "texture": "skins",
    "x": 3538,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "WQ": {
    "texture": "skins",
    "x": 410,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "WR": {
    "texture": "skins",
    "x": 342,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "WS": {
    "texture": "skins",
    "x": 682,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "WT": {
    "texture": "skins",
    "x": 3062,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "WU": {
    "texture": "skins",
    "x": 2246,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "WV": {
    "texture": "skins",
    "x": 1090,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "WW": {
    "texture": "skins",
    "x": 682,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "WX": {
    "texture": "skins",
    "x": 4014,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "WY": {
    "texture": "skins",
    "x": 274,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "WZ": {
    "texture": "skins",
    "x": 2926,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "Wa": {
    "texture": "wear",
    "x": 1487,
    "y": 1892,
    "w": 42,
    "h": 80,
    "px": 75,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Wb": {
    "texture": "wear",
    "x": 1505,
    "y": 1391,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Wc": {
    "texture": "wear",
    "x": 641,
    "y": 1779,
    "w": 13,
    "h": 54,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Wd": {
    "texture": "wear",
    "x": 1349,
    "y": 1970,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "We": {
    "texture": "wear",
    "x": 163,
    "y": 804,
    "w": 147,
    "h": 170,
    "px": 70.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "X": {
    "texture": "portions",
    "x": 2,
    "y": 326,
    "w": 37,
    "h": 62,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "XB": {
    "texture": "skins",
    "x": 3750,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "XC": {
    "texture": "skins",
    "x": 2110,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "XD": {
    "texture": "skins",
    "x": 682,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "XE": {
    "texture": "skins",
    "x": 2790,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "XF": {
    "texture": "skins",
    "x": 614,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "XG": {
    "texture": "skins",
    "x": 1430,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "XH": {
    "texture": "skins",
    "x": 2042,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "XI": {
    "texture": "skins",
    "x": 138,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "XJ": {
    "texture": "skins",
    "x": 546,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "XK": {
    "texture": "skins",
    "x": 3334,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "XL": {
    "texture": "skins",
    "x": 2178,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "XM": {
    "texture": "skins",
    "x": 2178,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "XN": {
    "texture": "skins",
    "x": 2790,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "XO": {
    "texture": "skins",
    "x": 1770,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "XP": {
    "texture": "skins",
    "x": 478,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "XQ": {
    "texture": "skins",
    "x": 478,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "XR": {
    "texture": "skins",
    "x": 2178,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "XS": {
    "texture": "skins",
    "x": 3470,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "XT": {
    "texture": "skins",
    "x": 954,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "XU": {
    "texture": "skins",
    "x": 1022,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "XV": {
    "texture": "skins",
    "x": 1974,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "XW": {
    "texture": "skins",
    "x": 2110,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "XX": {
    "texture": "skins",
    "x": 3062,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "XY": {
    "texture": "skins",
    "x": 206,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "XZ": {
    "texture": "skins",
    "x": 2110,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "Xa": {
    "texture": "wear",
    "x": 970,
    "y": 873,
    "w": 43,
    "h": 84,
    "px": 75.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Xb": {
    "texture": "wear",
    "x": 1498,
    "y": 1635,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Xc": {
    "texture": "wear",
    "x": 1512,
    "y": 1302,
    "w": 19,
    "h": 66,
    "px": 105.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Xd": {
    "texture": "wear",
    "x": 1070,
    "y": 1806,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "Xe": {
    "texture": "wear",
    "x": 163,
    "y": 474,
    "w": 169,
    "h": 157,
    "px": 61.5,
    "py": 61.5,
    "pw": 128,
    "ph": 128
  },
  "Y": {
    "texture": "portions",
    "x": 361,
    "y": 300,
    "w": 37,
    "h": 62,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "YB": {
    "texture": "skins",
    "x": 3390,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "YC": {
    "texture": "skins",
    "x": 4014,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "YD": {
    "texture": "skins",
    "x": 1770,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "YE": {
    "texture": "skins",
    "x": 682,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "YF": {
    "texture": "skins",
    "x": 342,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "YG": {
    "texture": "skins",
    "x": 1566,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "YH": {
    "texture": "skins",
    "x": 1022,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "YI": {
    "texture": "skins",
    "x": 274,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "YJ": {
    "texture": "skins",
    "x": 2246,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "YK": {
    "texture": "skins",
    "x": 1362,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "YL": {
    "texture": "skins",
    "x": 2450,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "YM": {
    "texture": "skins",
    "x": 886,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "YN": {
    "texture": "skins",
    "x": 3606,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "YO": {
    "texture": "skins",
    "x": 1022,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "YP": {
    "texture": "skins",
    "x": 1838,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "YQ": {
    "texture": "skins",
    "x": 614,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "YR": {
    "texture": "skins",
    "x": 3946,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "YS": {
    "texture": "skins",
    "x": 2042,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "YT": {
    "texture": "skins",
    "x": 1838,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "YU": {
    "texture": "skins",
    "x": 2722,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "YV": {
    "texture": "skins",
    "x": 274,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "YW": {
    "texture": "skins",
    "x": 614,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "YX": {
    "texture": "skins",
    "x": 3102,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "YY": {
    "texture": "skins",
    "x": 2926,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "YZ": {
    "texture": "skins",
    "x": 3878,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "Ya": {
    "texture": "wear",
    "x": 1466,
    "y": 1307,
    "w": 42,
    "h": 80,
    "px": 72,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Yb": {
    "texture": "wear",
    "x": 1567,
    "y": 607,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Yc": {
    "texture": "wear",
    "x": 1054,
    "y": 974,
    "w": 21,
    "h": 79,
    "px": 109.5,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "Yd": {
    "texture": "wear",
    "x": 741,
    "y": 1975,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "Ye": {
    "texture": "wear",
    "x": 2,
    "y": 1237,
    "w": 159,
    "h": 156,
    "px": 31.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Z": {
    "texture": "portions",
    "x": 295,
    "y": 350,
    "w": 37,
    "h": 62,
    "px": 31.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "ZB": {
    "texture": "skins",
    "x": 206,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "ZC": {
    "texture": "skins",
    "x": 3030,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "ZD": {
    "texture": "skins",
    "x": 478,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "ZE": {
    "texture": "skins",
    "x": 750,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "ZF": {
    "texture": "skins",
    "x": 1906,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "ZG": {
    "texture": "skins",
    "x": 70,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "ZH": {
    "texture": "skins",
    "x": 2110,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "ZI": {
    "texture": "skins",
    "x": 2246,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "ZJ": {
    "texture": "skins",
    "x": 1022,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "ZK": {
    "texture": "skins",
    "x": 1362,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "ZL": {
    "texture": "skins",
    "x": 2926,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "ZM": {
    "texture": "skins",
    "x": 954,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "ZN": {
    "texture": "skins",
    "x": 2518,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "ZO": {
    "texture": "skins",
    "x": 2314,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "ZP": {
    "texture": "skins",
    "x": 1906,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "ZQ": {
    "texture": "skins",
    "x": 3810,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "ZR": {
    "texture": "skins",
    "x": 3334,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "ZS": {
    "texture": "skins",
    "x": 2,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "ZT": {
    "texture": "skins",
    "x": 2246,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "ZU": {
    "texture": "skins",
    "x": 3742,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "ZV": {
    "texture": "skins",
    "x": 1634,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "ZW": {
    "texture": "skins",
    "x": 410,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "ZX": {
    "texture": "skins",
    "x": 4038,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "ZY": {
    "texture": "skins",
    "x": 2858,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "ZZ": {
    "texture": "skins",
    "x": 1022,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "Za": {
    "texture": "wear",
    "x": 831,
    "y": 1975,
    "w": 39,
    "h": 70,
    "px": 72.5,
    "py": 61,
    "pw": 128,
    "ph": 128
  },
  "Zb": {
    "texture": "wear",
    "x": 1502,
    "y": 1495,
    "w": 31,
    "h": 96,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Zc": {
    "texture": "wear",
    "x": 899,
    "y": 281,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "Zd": {
    "texture": "wear",
    "x": 1259,
    "y": 1970,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "Ze": {
    "texture": "wear",
    "x": 223,
    "y": 162,
    "w": 159,
    "h": 156,
    "px": 32.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "a": {
    "texture": "portions",
    "x": 402,
    "y": 332,
    "w": 62,
    "h": 33,
    "px": 32,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "aB": {
    "texture": "skins",
    "x": 3318,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "aC": {
    "texture": "skins",
    "x": 1906,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "aD": {
    "texture": "skins",
    "x": 274,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "aE": {
    "texture": "skins",
    "x": 1498,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "aF": {
    "texture": "skins",
    "x": 954,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "aG": {
    "texture": "skins",
    "x": 478,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "aH": {
    "texture": "skins",
    "x": 1566,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "aI": {
    "texture": "skins",
    "x": 2722,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "aJ": {
    "texture": "skins",
    "x": 954,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "aK": {
    "texture": "skins",
    "x": 2858,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "aL": {
    "texture": "skins",
    "x": 818,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "aM": {
    "texture": "skins",
    "x": 138,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "aN": {
    "texture": "skins",
    "x": 2858,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "aO": {
    "texture": "skins",
    "x": 3062,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "aP": {
    "texture": "skins",
    "x": 3930,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "aQ": {
    "texture": "skins",
    "x": 1974,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "aR": {
    "texture": "skins",
    "x": 2246,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "aS": {
    "texture": "skins",
    "x": 2994,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "aT": {
    "texture": "skins",
    "x": 1566,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "aU": {
    "texture": "skins",
    "x": 2382,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "aV": {
    "texture": "skins",
    "x": 2926,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "aW": {
    "texture": "skins",
    "x": 2450,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "aX": {
    "texture": "skins",
    "x": 3642,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "aY": {
    "texture": "skins",
    "x": 2382,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "aZ": {
    "texture": "skins",
    "x": 1362,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "aa": {
    "texture": "wear",
    "x": 1185,
    "y": 1422,
    "w": 17,
    "h": 88,
    "px": 69.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ab": {
    "texture": "wear",
    "x": 1589,
    "y": 707,
    "w": 11,
    "h": 32,
    "px": 115.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ac": {
    "texture": "wear",
    "x": 970,
    "y": 2,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ad": {
    "texture": "wear",
    "x": 1131,
    "y": 1806,
    "w": 57,
    "h": 148,
    "px": 19.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "ae": {
    "texture": "wear",
    "x": 223,
    "y": 2,
    "w": 160,
    "h": 156,
    "px": 32,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "b": {
    "texture": "portions",
    "x": 68,
    "y": 69,
    "w": 58,
    "h": 62,
    "px": 31,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "bB": {
    "texture": "skins",
    "x": 2654,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "bC": {
    "texture": "skins",
    "x": 1974,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "bD": {
    "texture": "skins",
    "x": 614,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "bE": {
    "texture": "skins",
    "x": 1634,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "bF": {
    "texture": "skins",
    "x": 2926,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "bG": {
    "texture": "skins",
    "x": 2994,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "bH": {
    "texture": "skins",
    "x": 886,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "bI": {
    "texture": "skins",
    "x": 1974,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "bJ": {
    "texture": "skins",
    "x": 274,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "bK": {
    "texture": "skins",
    "x": 1906,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "bL": {
    "texture": "skins",
    "x": 1770,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "bM": {
    "texture": "skins",
    "x": 70,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "bN": {
    "texture": "skins",
    "x": 3810,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "bO": {
    "texture": "skins",
    "x": 3742,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "bP": {
    "texture": "skins",
    "x": 478,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "bQ": {
    "texture": "skins",
    "x": 1362,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "bR": {
    "texture": "skins",
    "x": 614,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "bS": {
    "texture": "skins",
    "x": 410,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "bT": {
    "texture": "skins",
    "x": 1702,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "bU": {
    "texture": "skins",
    "x": 954,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "bV": {
    "texture": "skins",
    "x": 2518,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "bW": {
    "texture": "skins",
    "x": 3946,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "bX": {
    "texture": "skins",
    "x": 1634,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "bY": {
    "texture": "skins",
    "x": 2246,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "bZ": {
    "texture": "skins",
    "x": 954,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "ba": {
    "texture": "wear",
    "x": 1344,
    "y": 1216,
    "w": 27,
    "h": 76,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "bb": {
    "texture": "wear",
    "x": 1306,
    "y": 1836,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "bc": {
    "texture": "wear",
    "x": 880,
    "y": 587,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "bd": {
    "texture": "wear",
    "x": 551,
    "y": 1779,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 118.5,
    "pw": 128,
    "ph": 128
  },
  "be": {
    "texture": "wear",
    "x": 795,
    "y": 1433,
    "w": 99,
    "h": 172,
    "px": 21.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "c": {
    "texture": "portions",
    "x": 205,
    "y": 355,
    "w": 64,
    "h": 35,
    "px": 32,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "cB": {
    "texture": "skins",
    "x": 3894,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "cC": {
    "texture": "skins",
    "x": 1770,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "cD": {
    "texture": "skins",
    "x": 1294,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "cE": {
    "texture": "skins",
    "x": 546,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "cF": {
    "texture": "skins",
    "x": 954,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "cG": {
    "texture": "skins",
    "x": 2722,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "cH": {
    "texture": "skins",
    "x": 1226,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "cI": {
    "texture": "skins",
    "x": 614,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "cJ": {
    "texture": "skins",
    "x": 3858,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "cK": {
    "texture": "skins",
    "x": 1430,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "cL": {
    "texture": "skins",
    "x": 1362,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "cM": {
    "texture": "skins",
    "x": 1158,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "cN": {
    "texture": "skins",
    "x": 886,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "cO": {
    "texture": "skins",
    "x": 3198,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "cP": {
    "texture": "skins",
    "x": 2790,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "cQ": {
    "texture": "skins",
    "x": 1770,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "cR": {
    "texture": "skins",
    "x": 2042,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "cS": {
    "texture": "skins",
    "x": 1974,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "cT": {
    "texture": "skins",
    "x": 2314,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "cU": {
    "texture": "skins",
    "x": 2994,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "cV": {
    "texture": "skins",
    "x": 954,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "cW": {
    "texture": "skins",
    "x": 70,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "cX": {
    "texture": "skins",
    "x": 1974,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "cY": {
    "texture": "skins",
    "x": 3470,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "cZ": {
    "texture": "skins",
    "x": 2450,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "ca": {
    "texture": "wear",
    "x": 1456,
    "y": 1551,
    "w": 42,
    "h": 80,
    "px": 75,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "cb": {
    "texture": "wear",
    "x": 1526,
    "y": 877,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "cc": {
    "texture": "wear",
    "x": 962,
    "y": 429,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "cd": {
    "texture": "wear",
    "x": 1559,
    "y": 65,
    "w": 86,
    "h": 59,
    "px": 91,
    "py": 7.5,
    "pw": 128,
    "ph": 128
  },
  "ce": {
    "texture": "wear",
    "x": 783,
    "y": 1256,
    "w": 99,
    "h": 173,
    "px": 21.5,
    "py": 62.5,
    "pw": 128,
    "ph": 128
  },
  "d": {
    "texture": "portions",
    "x": 2,
    "y": 392,
    "w": 63,
    "h": 35,
    "px": 32.5,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "dB": {
    "texture": "skins",
    "x": 2858,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "dC": {
    "texture": "skins",
    "x": 2722,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "dD": {
    "texture": "skins",
    "x": 3858,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "dE": {
    "texture": "skins",
    "x": 2178,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "dF": {
    "texture": "skins",
    "x": 1838,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "dG": {
    "texture": "skins",
    "x": 478,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "dH": {
    "texture": "skins",
    "x": 342,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "dI": {
    "texture": "skins",
    "x": 2926,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "dJ": {
    "texture": "skins",
    "x": 818,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "dK": {
    "texture": "skins",
    "x": 410,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "dL": {
    "texture": "skins",
    "x": 478,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "dM": {
    "texture": "skins",
    "x": 2178,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "dN": {
    "texture": "skins",
    "x": 682,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "dO": {
    "texture": "skins",
    "x": 1022,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "dP": {
    "texture": "skins",
    "x": 3878,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "dQ": {
    "texture": "skins",
    "x": 1430,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "dR": {
    "texture": "skins",
    "x": 2,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "dS": {
    "texture": "skins",
    "x": 2654,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "dT": {
    "texture": "skins",
    "x": 2,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "dU": {
    "texture": "skins",
    "x": 2450,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "dV": {
    "texture": "skins",
    "x": 750,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "dW": {
    "texture": "skins",
    "x": 2450,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "dX": {
    "texture": "skins",
    "x": 2926,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "dY": {
    "texture": "skins",
    "x": 3130,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "dZ": {
    "texture": "skins",
    "x": 3138,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "da": {
    "texture": "wear",
    "x": 1206,
    "y": 1562,
    "w": 42,
    "h": 80,
    "px": 75,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "db": {
    "texture": "wear",
    "x": 1319,
    "y": 948,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "dc": {
    "texture": "wear",
    "x": 880,
    "y": 439,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "dd": {
    "texture": "wear",
    "x": 136,
    "y": 1769,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "de": {
    "texture": "wear",
    "x": 767,
    "y": 906,
    "w": 99,
    "h": 173,
    "px": 21.5,
    "py": 62.5,
    "pw": 128,
    "ph": 128
  },
  "e": {
    "texture": "portions",
    "x": 102,
    "y": 376,
    "w": 64,
    "h": 35,
    "px": 32,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "eB": {
    "texture": "skins",
    "x": 3426,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "eC": {
    "texture": "skins",
    "x": 2314,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "eD": {
    "texture": "skins",
    "x": 3426,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "eE": {
    "texture": "skins",
    "x": 2,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "eF": {
    "texture": "skins",
    "x": 3606,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "eG": {
    "texture": "skins",
    "x": 2858,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "eH": {
    "texture": "skins",
    "x": 614,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "eI": {
    "texture": "skins",
    "x": 2042,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "eJ": {
    "texture": "skins",
    "x": 342,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "eK": {
    "texture": "skins",
    "x": 682,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "eL": {
    "texture": "skins",
    "x": 2722,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "eM": {
    "texture": "skins",
    "x": 2586,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "eN": {
    "texture": "skins",
    "x": 70,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "eO": {
    "texture": "skins",
    "x": 3334,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "eP": {
    "texture": "skins",
    "x": 2586,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "eQ": {
    "texture": "skins",
    "x": 2314,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "eR": {
    "texture": "skins",
    "x": 2314,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "eS": {
    "texture": "skins",
    "x": 138,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "eT": {
    "texture": "skins",
    "x": 1702,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "eU": {
    "texture": "skins",
    "x": 1090,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "eV": {
    "texture": "skins",
    "x": 2518,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "eW": {
    "texture": "skins",
    "x": 2926,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "eX": {
    "texture": "skins",
    "x": 2042,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "eY": {
    "texture": "skins",
    "x": 478,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "eZ": {
    "texture": "skins",
    "x": 3966,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "ea": {
    "texture": "wear",
    "x": 1474,
    "y": 1218,
    "w": 42,
    "h": 80,
    "px": 75,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "eb": {
    "texture": "wear",
    "x": 1487,
    "y": 1976,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "ec": {
    "texture": "wear",
    "x": 962,
    "y": 577,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ed": {
    "texture": "wear",
    "x": 271,
    "y": 1698,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "ee": {
    "texture": "wear",
    "x": 2,
    "y": 673,
    "w": 157,
    "h": 195,
    "px": 68.5,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "f": {
    "texture": "portions",
    "x": 453,
    "y": 2,
    "w": 49,
    "h": 63,
    "px": 32.5,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "fB": {
    "texture": "skins",
    "x": 1294,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "fC": {
    "texture": "skins",
    "x": 2518,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "fD": {
    "texture": "skins",
    "x": 1770,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "fE": {
    "texture": "skins",
    "x": 1294,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "fF": {
    "texture": "skins",
    "x": 3130,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "fG": {
    "texture": "skins",
    "x": 546,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "fH": {
    "texture": "skins",
    "x": 546,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "fI": {
    "texture": "skins",
    "x": 1022,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "fJ": {
    "texture": "skins",
    "x": 3198,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "fK": {
    "texture": "skins",
    "x": 70,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "fL": {
    "texture": "skins",
    "x": 2110,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "fM": {
    "texture": "skins",
    "x": 1838,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "fN": {
    "texture": "skins",
    "x": 3538,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "fO": {
    "texture": "skins",
    "x": 1362,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "fP": {
    "texture": "skins",
    "x": 1226,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "fQ": {
    "texture": "skins",
    "x": 2926,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "fR": {
    "texture": "skins",
    "x": 2518,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "fS": {
    "texture": "skins",
    "x": 1702,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "fT": {
    "texture": "skins",
    "x": 3538,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "fU": {
    "texture": "skins",
    "x": 546,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "fV": {
    "texture": "skins",
    "x": 3470,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "fW": {
    "texture": "skins",
    "x": 2858,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "fX": {
    "texture": "skins",
    "x": 750,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "fY": {
    "texture": "skins",
    "x": 3810,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "fZ": {
    "texture": "skins",
    "x": 3534,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "fa": {
    "texture": "wear",
    "x": 1442,
    "y": 412,
    "w": 36,
    "h": 102,
    "px": 77,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "fb": {
    "texture": "wear",
    "x": 1365,
    "y": 1432,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "fc": {
    "texture": "wear",
    "x": 970,
    "y": 725,
    "w": 78,
    "h": 144,
    "px": 11,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "fd": {
    "texture": "wear",
    "x": 271,
    "y": 1862,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "fe": {
    "texture": "wear",
    "x": 624,
    "y": 1083,
    "w": 39,
    "h": 130,
    "px": 16.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "g": {
    "texture": "portions",
    "x": 64,
    "y": 135,
    "w": 50,
    "h": 63,
    "px": 32,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "gB": {
    "texture": "skins",
    "x": 1158,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "gC": {
    "texture": "skins",
    "x": 1838,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "gD": {
    "texture": "skins",
    "x": 2722,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "gE": {
    "texture": "skins",
    "x": 342,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "gF": {
    "texture": "skins",
    "x": 2994,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "gG": {
    "texture": "skins",
    "x": 1158,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "gH": {
    "texture": "skins",
    "x": 1362,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "gI": {
    "texture": "skins",
    "x": 1022,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "gJ": {
    "texture": "skins",
    "x": 138,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "gK": {
    "texture": "skins",
    "x": 2450,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "gL": {
    "texture": "skins",
    "x": 1226,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "gM": {
    "texture": "skins",
    "x": 2178,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "gN": {
    "texture": "skins",
    "x": 2042,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "gO": {
    "texture": "skins",
    "x": 3470,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "gP": {
    "texture": "skins",
    "x": 478,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "gQ": {
    "texture": "skins",
    "x": 3062,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "gR": {
    "texture": "skins",
    "x": 2,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "gS": {
    "texture": "skins",
    "x": 2926,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "gT": {
    "texture": "skins",
    "x": 2926,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "gU": {
    "texture": "skins",
    "x": 1022,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "gV": {
    "texture": "skins",
    "x": 682,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "gW": {
    "texture": "skins",
    "x": 3742,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "gX": {
    "texture": "skins",
    "x": 2382,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "gY": {
    "texture": "skins",
    "x": 546,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "gZ": {
    "texture": "skins",
    "x": 3138,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "ga": {
    "texture": "wear",
    "x": 1428,
    "y": 1218,
    "w": 42,
    "h": 85,
    "px": 75,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "gb": {
    "texture": "wear",
    "x": 1493,
    "y": 1835,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "gc": {
    "texture": "wear",
    "x": 1288,
    "y": 676,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "gd": {
    "texture": "wear",
    "x": 261,
    "y": 1534,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "ge": {
    "texture": "wear",
    "x": 2,
    "y": 872,
    "w": 157,
    "h": 195,
    "px": 68.5,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "h": {
    "texture": "portions",
    "x": 2,
    "y": 197,
    "w": 49,
    "h": 63,
    "px": 32.5,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "hB": {
    "texture": "skins",
    "x": 886,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "hC": {
    "texture": "skins",
    "x": 2654,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "hD": {
    "texture": "skins",
    "x": 1634,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "hE": {
    "texture": "skins",
    "x": 274,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "hF": {
    "texture": "skins",
    "x": 274,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "hG": {
    "texture": "skins",
    "x": 3334,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "hH": {
    "texture": "skins",
    "x": 1838,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "hI": {
    "texture": "skins",
    "x": 1430,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "hJ": {
    "texture": "skins",
    "x": 3402,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "hK": {
    "texture": "skins",
    "x": 3062,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "hL": {
    "texture": "skins",
    "x": 2178,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "hM": {
    "texture": "skins",
    "x": 2110,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "hN": {
    "texture": "skins",
    "x": 1838,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "hO": {
    "texture": "skins",
    "x": 478,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "hP": {
    "texture": "skins",
    "x": 2,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "hQ": {
    "texture": "skins",
    "x": 2926,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "hR": {
    "texture": "skins",
    "x": 1634,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "hS": {
    "texture": "skins",
    "x": 1702,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "hT": {
    "texture": "skins",
    "x": 886,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "hU": {
    "texture": "skins",
    "x": 2382,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "hV": {
    "texture": "skins",
    "x": 1566,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "hW": {
    "texture": "skins",
    "x": 342,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "hX": {
    "texture": "skins",
    "x": 478,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "hY": {
    "texture": "skins",
    "x": 1974,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "hZ": {
    "texture": "skins",
    "x": 1702,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "ha": {
    "texture": "wear",
    "x": 1526,
    "y": 784,
    "w": 40,
    "h": 89,
    "px": 71,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "hb": {
    "texture": "wear",
    "x": 1454,
    "y": 126,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "hc": {
    "texture": "wear",
    "x": 1175,
    "y": 980,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "hd": {
    "texture": "wear",
    "x": 409,
    "y": 1275,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "he": {
    "texture": "wear",
    "x": 2,
    "y": 474,
    "w": 157,
    "h": 195,
    "px": 68.5,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "i": {
    "texture": "portions",
    "x": 170,
    "y": 394,
    "w": 62,
    "h": 33,
    "px": 32,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "iB": {
    "texture": "skins",
    "x": 478,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "iC": {
    "texture": "skins",
    "x": 1430,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "iD": {
    "texture": "skins",
    "x": 3266,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "iE": {
    "texture": "skins",
    "x": 1838,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "iF": {
    "texture": "skins",
    "x": 2586,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "iG": {
    "texture": "skins",
    "x": 274,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "iH": {
    "texture": "skins",
    "x": 478,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "iI": {
    "texture": "skins",
    "x": 2926,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "iJ": {
    "texture": "skins",
    "x": 1702,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "iK": {
    "texture": "skins",
    "x": 3878,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "iL": {
    "texture": "skins",
    "x": 2178,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "iM": {
    "texture": "skins",
    "x": 1294,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "iN": {
    "texture": "skins",
    "x": 4014,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "iO": {
    "texture": "skins",
    "x": 2790,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "iP": {
    "texture": "skins",
    "x": 3946,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "iQ": {
    "texture": "skins",
    "x": 1702,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "iR": {
    "texture": "skins",
    "x": 1770,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "iS": {
    "texture": "skins",
    "x": 546,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "iT": {
    "texture": "skins",
    "x": 206,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "iU": {
    "texture": "skins",
    "x": 410,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "iV": {
    "texture": "skins",
    "x": 614,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "iW": {
    "texture": "skins",
    "x": 614,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "iX": {
    "texture": "skins",
    "x": 2654,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "iY": {
    "texture": "skins",
    "x": 3678,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "iZ": {
    "texture": "skins",
    "x": 410,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "ia": {
    "texture": "wear",
    "x": 1365,
    "y": 1566,
    "w": 45,
    "h": 88,
    "px": 72.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ib": {
    "texture": "wear",
    "x": 47,
    "y": 1995,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "ic": {
    "texture": "wear",
    "x": 1109,
    "y": 1376,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "id": {
    "texture": "wear",
    "x": 396,
    "y": 1534,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "ie": {
    "texture": "wear",
    "x": 120,
    "y": 1397,
    "w": 133,
    "h": 181,
    "px": -34.5,
    "py": 61.5,
    "pw": 128,
    "ph": 128
  },
  "j": {
    "texture": "portions",
    "x": 135,
    "y": 68,
    "w": 58,
    "h": 62,
    "px": 31,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "jB": {
    "texture": "skins",
    "x": 2178,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "jC": {
    "texture": "skins",
    "x": 1770,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "jD": {
    "texture": "skins",
    "x": 2314,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "jE": {
    "texture": "skins",
    "x": 1226,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "jF": {
    "texture": "skins",
    "x": 2042,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "jG": {
    "texture": "skins",
    "x": 3642,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "jH": {
    "texture": "skins",
    "x": 2790,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "jI": {
    "texture": "skins",
    "x": 3198,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "jJ": {
    "texture": "skins",
    "x": 3198,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "jK": {
    "texture": "skins",
    "x": 2110,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "jL": {
    "texture": "skins",
    "x": 410,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "jM": {
    "texture": "skins",
    "x": 138,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "jN": {
    "texture": "skins",
    "x": 206,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "jO": {
    "texture": "skins",
    "x": 206,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "jP": {
    "texture": "skins",
    "x": 3606,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "jQ": {
    "texture": "skins",
    "x": 2790,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "jR": {
    "texture": "skins",
    "x": 2858,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "jS": {
    "texture": "skins",
    "x": 1906,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "jT": {
    "texture": "skins",
    "x": 2790,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "jU": {
    "texture": "skins",
    "x": 3606,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "jV": {
    "texture": "skins",
    "x": 1770,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "jW": {
    "texture": "skins",
    "x": 546,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "jX": {
    "texture": "skins",
    "x": 614,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "jY": {
    "texture": "skins",
    "x": 4038,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "jZ": {
    "texture": "skins",
    "x": 818,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "ja": {
    "texture": "wear",
    "x": 1142,
    "y": 1958,
    "w": 45,
    "h": 88,
    "px": 72.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "jb": {
    "texture": "wear",
    "x": 1309,
    "y": 1532,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "jc": {
    "texture": "wear",
    "x": 1354,
    "y": 538,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "jd": {
    "texture": "wear",
    "x": 571,
    "y": 147,
    "w": 131,
    "h": 160,
    "px": 38.5,
    "py": 66,
    "pw": 128,
    "ph": 128
  },
  "je": {
    "texture": "wear",
    "x": 163,
    "y": 635,
    "w": 153,
    "h": 165,
    "px": 12.5,
    "py": 70.5,
    "pw": 128,
    "ph": 128
  },
  "k": {
    "texture": "portions",
    "x": 130,
    "y": 134,
    "w": 50,
    "h": 63,
    "px": 32,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "kB": {
    "texture": "skins",
    "x": 3538,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "kC": {
    "texture": "skins",
    "x": 1022,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "kD": {
    "texture": "skins",
    "x": 2518,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "kE": {
    "texture": "skins",
    "x": 1634,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "kF": {
    "texture": "skins",
    "x": 3062,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "kG": {
    "texture": "skins",
    "x": 2450,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "kH": {
    "texture": "skins",
    "x": 3742,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "kI": {
    "texture": "skins",
    "x": 614,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "kJ": {
    "texture": "skins",
    "x": 2,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "kK": {
    "texture": "skins",
    "x": 2790,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "kL": {
    "texture": "skins",
    "x": 478,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "kM": {
    "texture": "skins",
    "x": 138,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "kN": {
    "texture": "skins",
    "x": 1906,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "kO": {
    "texture": "skins",
    "x": 1702,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "kP": {
    "texture": "skins",
    "x": 3030,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "kQ": {
    "texture": "skins",
    "x": 2926,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "kR": {
    "texture": "skins",
    "x": 1566,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "kS": {
    "texture": "skins",
    "x": 2858,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "kT": {
    "texture": "skins",
    "x": 2858,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "kU": {
    "texture": "skins",
    "x": 1770,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "kV": {
    "texture": "skins",
    "x": 1294,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "kW": {
    "texture": "skins",
    "x": 1634,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "kX": {
    "texture": "skins",
    "x": 1634,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "kY": {
    "texture": "skins",
    "x": 3786,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "kZ": {
    "texture": "skins",
    "x": 682,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "ka": {
    "texture": "wear",
    "x": 203,
    "y": 1933,
    "w": 42,
    "h": 112,
    "px": 76,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "kb": {
    "texture": "wear",
    "x": 267,
    "y": 1158,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "kc": {
    "texture": "wear",
    "x": 1070,
    "y": 1516,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "kd": {
    "texture": "wear",
    "x": 658,
    "y": 1779,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "ke": {
    "texture": "wear",
    "x": 795,
    "y": 1609,
    "w": 117,
    "h": 145,
    "px": 34.5,
    "py": 62.5,
    "pw": 128,
    "ph": 128
  },
  "l": {
    "texture": "portions",
    "x": 327,
    "y": 68,
    "w": 51,
    "h": 64,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "lB": {
    "texture": "skins",
    "x": 342,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "lC": {
    "texture": "skins",
    "x": 2110,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "lD": {
    "texture": "skins",
    "x": 2654,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "lE": {
    "texture": "skins",
    "x": 886,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "lF": {
    "texture": "skins",
    "x": 1498,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "lG": {
    "texture": "skins",
    "x": 614,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "lH": {
    "texture": "skins",
    "x": 3266,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "lI": {
    "texture": "skins",
    "x": 750,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "lJ": {
    "texture": "skins",
    "x": 3878,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "lK": {
    "texture": "skins",
    "x": 1974,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "lL": {
    "texture": "skins",
    "x": 750,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "lM": {
    "texture": "skins",
    "x": 1974,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "lN": {
    "texture": "skins",
    "x": 3674,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "lO": {
    "texture": "skins",
    "x": 2,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "lP": {
    "texture": "skins",
    "x": 3570,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "lQ": {
    "texture": "skins",
    "x": 954,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "lR": {
    "texture": "skins",
    "x": 1974,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "lS": {
    "texture": "skins",
    "x": 2858,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "lT": {
    "texture": "skins",
    "x": 1906,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "lU": {
    "texture": "skins",
    "x": 2,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "lV": {
    "texture": "skins",
    "x": 1362,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "lW": {
    "texture": "skins",
    "x": 1702,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "lX": {
    "texture": "skins",
    "x": 2722,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "lY": {
    "texture": "skins",
    "x": 3750,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "lZ": {
    "texture": "skins",
    "x": 1702,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "la": {
    "texture": "wear",
    "x": 1320,
    "y": 1432,
    "w": 41,
    "h": 94,
    "px": 77.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "lb": {
    "texture": "wear",
    "x": 1344,
    "y": 1082,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "lc": {
    "texture": "wear",
    "x": 1278,
    "y": 538,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ld": {
    "texture": "wear",
    "x": 1411,
    "y": 1800,
    "w": 34,
    "h": 136,
    "px": 1,
    "py": 68,
    "pw": 128,
    "ph": 128
  },
  "le": {
    "texture": "wear",
    "x": 177,
    "y": 978,
    "w": 127,
    "h": 176,
    "px": 3.5,
    "py": 59,
    "pw": 128,
    "ph": 128
  },
  "m": {
    "texture": "portions",
    "x": 69,
    "y": 415,
    "w": 62,
    "h": 33,
    "px": 32,
    "py": 33.5,
    "pw": 64,
    "ph": 64
  },
  "mB": {
    "texture": "skins",
    "x": 2382,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "mC": {
    "texture": "skins",
    "x": 138,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "mD": {
    "texture": "skins",
    "x": 2722,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "mE": {
    "texture": "skins",
    "x": 2178,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "mF": {
    "texture": "skins",
    "x": 1838,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "mG": {
    "texture": "skins",
    "x": 2110,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "mH": {
    "texture": "skins",
    "x": 3606,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "mI": {
    "texture": "skins",
    "x": 3878,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "mJ": {
    "texture": "skins",
    "x": 3130,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "mK": {
    "texture": "skins",
    "x": 1770,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "mL": {
    "texture": "skins",
    "x": 1158,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "mM": {
    "texture": "skins",
    "x": 546,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "mN": {
    "texture": "skins",
    "x": 2382,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "mO": {
    "texture": "skins",
    "x": 1430,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "mP": {
    "texture": "skins",
    "x": 2110,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "mQ": {
    "texture": "skins",
    "x": 1566,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "mR": {
    "texture": "skins",
    "x": 1022,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "mS": {
    "texture": "skins",
    "x": 2654,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "mT": {
    "texture": "skins",
    "x": 1362,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "mU": {
    "texture": "skins",
    "x": 682,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "mV": {
    "texture": "skins",
    "x": 1770,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "mW": {
    "texture": "skins",
    "x": 1294,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "mX": {
    "texture": "skins",
    "x": 1090,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "mY": {
    "texture": "skins",
    "x": 1906,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "mZ": {
    "texture": "skins",
    "x": 614,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "ma": {
    "texture": "wear",
    "x": 916,
    "y": 1647,
    "w": 43,
    "h": 106,
    "px": 75.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "mb": {
    "texture": "wear",
    "x": 2,
    "y": 1995,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "mc": {
    "texture": "wear",
    "x": 1239,
    "y": 838,
    "w": 72,
    "h": 134,
    "px": 27,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "md": {
    "texture": "wear",
    "x": 531,
    "y": 1439,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "me": {
    "texture": "wear",
    "x": 670,
    "y": 1083,
    "w": 112,
    "h": 169,
    "px": 3,
    "py": 59.5,
    "pw": 128,
    "ph": 128
  },
  "n": {
    "texture": "portions",
    "x": 336,
    "y": 366,
    "w": 62,
    "h": 33,
    "px": 32,
    "py": 33.5,
    "pw": 64,
    "ph": 64
  },
  "nB": {
    "texture": "skins",
    "x": 2178,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "nC": {
    "texture": "skins",
    "x": 1090,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "nD": {
    "texture": "skins",
    "x": 2,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "nE": {
    "texture": "skins",
    "x": 274,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "nF": {
    "texture": "skins",
    "x": 1430,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "nG": {
    "texture": "skins",
    "x": 342,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "nH": {
    "texture": "skins",
    "x": 3946,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "nI": {
    "texture": "skins",
    "x": 1566,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "nJ": {
    "texture": "skins",
    "x": 1430,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "nK": {
    "texture": "skins",
    "x": 2926,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "nL": {
    "texture": "skins",
    "x": 410,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "nM": {
    "texture": "skins",
    "x": 2382,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "nN": {
    "texture": "skins",
    "x": 274,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "nO": {
    "texture": "skins",
    "x": 954,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "nP": {
    "texture": "skins",
    "x": 750,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "nQ": {
    "texture": "skins",
    "x": 2586,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "nR": {
    "texture": "skins",
    "x": 1498,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "nS": {
    "texture": "skins",
    "x": 2654,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "nT": {
    "texture": "skins",
    "x": 2654,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "nU": {
    "texture": "skins",
    "x": 750,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "nV": {
    "texture": "skins",
    "x": 954,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "nW": {
    "texture": "skins",
    "x": 1430,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "nX": {
    "texture": "skins",
    "x": 1702,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "nY": {
    "texture": "skins",
    "x": 274,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "nZ": {
    "texture": "skins",
    "x": 138,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "na": {
    "texture": "wear",
    "x": 1418,
    "y": 1706,
    "w": 41,
    "h": 90,
    "px": 75.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "nb": {
    "texture": "wear",
    "x": 1362,
    "y": 1666,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "nc": {
    "texture": "wear",
    "x": 1052,
    "y": 2,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "nd": {
    "texture": "wear",
    "x": 1452,
    "y": 1078,
    "w": 34,
    "h": 136,
    "px": 1,
    "py": 68,
    "pw": 128,
    "ph": 128
  },
  "ne": {
    "texture": "wear",
    "x": 136,
    "y": 1582,
    "w": 121,
    "h": 183,
    "px": -2.5,
    "py": 58.5,
    "pw": 128,
    "ph": 128
  },
  "o": {
    "texture": "portions",
    "x": 118,
    "y": 201,
    "w": 58,
    "h": 51,
    "px": 33,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "oB": {
    "texture": "skins",
    "x": 1158,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "oC": {
    "texture": "skins",
    "x": 3198,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "oD": {
    "texture": "skins",
    "x": 2110,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "oE": {
    "texture": "skins",
    "x": 3282,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "oF": {
    "texture": "skins",
    "x": 1702,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "oG": {
    "texture": "skins",
    "x": 3130,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "oH": {
    "texture": "skins",
    "x": 2518,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "oI": {
    "texture": "skins",
    "x": 750,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "oJ": {
    "texture": "skins",
    "x": 206,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "oK": {
    "texture": "skins",
    "x": 1090,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "oL": {
    "texture": "skins",
    "x": 410,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "oM": {
    "texture": "skins",
    "x": 1226,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "oN": {
    "texture": "skins",
    "x": 1634,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "oO": {
    "texture": "skins",
    "x": 3810,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "oP": {
    "texture": "skins",
    "x": 1090,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "oQ": {
    "texture": "skins",
    "x": 1226,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "oR": {
    "texture": "skins",
    "x": 342,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "oS": {
    "texture": "skins",
    "x": 2654,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "oT": {
    "texture": "skins",
    "x": 2382,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "oU": {
    "texture": "skins",
    "x": 1634,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "oV": {
    "texture": "skins",
    "x": 1090,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "oW": {
    "texture": "skins",
    "x": 1158,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "oX": {
    "texture": "skins",
    "x": 1566,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "oY": {
    "texture": "skins",
    "x": 954,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "oZ": {
    "texture": "skins",
    "x": 3062,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "oa": {
    "texture": "wear",
    "x": 1252,
    "y": 1702,
    "w": 46,
    "h": 73,
    "px": 77,
    "py": 67.5,
    "pw": 128,
    "ph": 128
  },
  "ob": {
    "texture": "wear",
    "x": 1529,
    "y": 707,
    "w": 41,
    "h": 48,
    "px": 141.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "oc": {
    "texture": "wear",
    "x": 1044,
    "y": 292,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "od": {
    "texture": "wear",
    "x": 532,
    "y": 1849,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "oe": {
    "texture": "wear",
    "x": 2,
    "y": 1806,
    "w": 130,
    "h": 185,
    "px": -5,
    "py": 62.5,
    "pw": 128,
    "ph": 128
  },
  "p": {
    "texture": "portions",
    "x": 184,
    "y": 198,
    "w": 58,
    "h": 51,
    "px": 33,
    "py": 32.5,
    "pw": 64,
    "ph": 64
  },
  "pB": {
    "texture": "skins",
    "x": 342,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "pC": {
    "texture": "skins",
    "x": 1974,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "pD": {
    "texture": "skins",
    "x": 478,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "pE": {
    "texture": "skins",
    "x": 2246,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "pF": {
    "texture": "skins",
    "x": 2722,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "pG": {
    "texture": "skins",
    "x": 2654,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "pH": {
    "texture": "skins",
    "x": 2518,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "pI": {
    "texture": "skins",
    "x": 478,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "pJ": {
    "texture": "skins",
    "x": 2926,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "pK": {
    "texture": "skins",
    "x": 2110,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "pL": {
    "texture": "skins",
    "x": 342,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "pM": {
    "texture": "skins",
    "x": 546,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "pN": {
    "texture": "skins",
    "x": 2042,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "pO": {
    "texture": "skins",
    "x": 3402,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "pP": {
    "texture": "skins",
    "x": 138,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "pQ": {
    "texture": "skins",
    "x": 1770,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "pR": {
    "texture": "skins",
    "x": 1294,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "pS": {
    "texture": "skins",
    "x": 886,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "pT": {
    "texture": "skins",
    "x": 3674,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "pU": {
    "texture": "skins",
    "x": 2450,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "pV": {
    "texture": "skins",
    "x": 886,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "pW": {
    "texture": "skins",
    "x": 1362,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "pX": {
    "texture": "skins",
    "x": 3210,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "pY": {
    "texture": "skins",
    "x": 2246,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "pZ": {
    "texture": "skins",
    "x": 2926,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "pa": {
    "texture": "wear",
    "x": 1538,
    "y": 1835,
    "w": 20,
    "h": 48,
    "px": 109,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "pb": {
    "texture": "wear",
    "x": 1136,
    "y": 696,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "pc": {
    "texture": "wear",
    "x": 1065,
    "y": 140,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "pd": {
    "texture": "wear",
    "x": 1421,
    "y": 1411,
    "w": 34,
    "h": 136,
    "px": 1,
    "py": 68,
    "pw": 128,
    "ph": 128
  },
  "pe": {
    "texture": "wear",
    "x": 2,
    "y": 1615,
    "w": 130,
    "h": 187,
    "px": -9,
    "py": 65.5,
    "pw": 128,
    "ph": 128
  },
  "q": {
    "texture": "portions",
    "x": 435,
    "y": 238,
    "w": 59,
    "h": 43,
    "px": 32.5,
    "py": 31.5,
    "pw": 64,
    "ph": 64
  },
  "qB": {
    "texture": "skins",
    "x": 1702,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "qC": {
    "texture": "skins",
    "x": 3714,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "qD": {
    "texture": "skins",
    "x": 2382,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "qE": {
    "texture": "skins",
    "x": 274,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "qF": {
    "texture": "skins",
    "x": 342,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "qG": {
    "texture": "skins",
    "x": 70,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "qH": {
    "texture": "skins",
    "x": 478,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "qI": {
    "texture": "skins",
    "x": 1226,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "qJ": {
    "texture": "skins",
    "x": 410,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "qK": {
    "texture": "skins",
    "x": 1430,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "qL": {
    "texture": "skins",
    "x": 2042,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "qM": {
    "texture": "skins",
    "x": 1158,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "qN": {
    "texture": "skins",
    "x": 3198,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "qO": {
    "texture": "skins",
    "x": 1770,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "qP": {
    "texture": "skins",
    "x": 1634,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "qQ": {
    "texture": "skins",
    "x": 1566,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "qR": {
    "texture": "skins",
    "x": 2518,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "qS": {
    "texture": "skins",
    "x": 3266,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "qT": {
    "texture": "skins",
    "x": 1294,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "qU": {
    "texture": "skins",
    "x": 2178,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "qV": {
    "texture": "skins",
    "x": 2586,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "qW": {
    "texture": "skins",
    "x": 2654,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "qX": {
    "texture": "skins",
    "x": 2994,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "qY": {
    "texture": "skins",
    "x": 2450,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "qZ": {
    "texture": "skins",
    "x": 3946,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "qa": {
    "texture": "wear",
    "x": 1319,
    "y": 1082,
    "w": 19,
    "h": 24,
    "px": 110.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "qb": {
    "texture": "wear",
    "x": 1202,
    "y": 412,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "qc": {
    "texture": "wear",
    "x": 563,
    "y": 311,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "qd": {
    "texture": "wear",
    "x": 544,
    "y": 1252,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "qe": {
    "texture": "wear",
    "x": 1376,
    "y": 1216,
    "w": 48,
    "h": 128,
    "px": 73,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "r": {
    "texture": "portions",
    "x": 435,
    "y": 285,
    "w": 58,
    "h": 43,
    "px": 32,
    "py": 31.5,
    "pw": 64,
    "ph": 64
  },
  "rB": {
    "texture": "skins",
    "x": 1906,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "rC": {
    "texture": "skins",
    "x": 2246,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "rD": {
    "texture": "skins",
    "x": 1090,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "rE": {
    "texture": "skins",
    "x": 1566,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "rF": {
    "texture": "skins",
    "x": 2586,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "rG": {
    "texture": "skins",
    "x": 682,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "rH": {
    "texture": "skins",
    "x": 274,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "rI": {
    "texture": "skins",
    "x": 2518,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "rJ": {
    "texture": "skins",
    "x": 2382,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "rK": {
    "texture": "skins",
    "x": 70,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "rL": {
    "texture": "skins",
    "x": 750,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "rM": {
    "texture": "skins",
    "x": 614,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "rN": {
    "texture": "skins",
    "x": 2586,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "rO": {
    "texture": "skins",
    "x": 3878,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "rP": {
    "texture": "skins",
    "x": 2042,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "rQ": {
    "texture": "skins",
    "x": 1362,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "rR": {
    "texture": "skins",
    "x": 2722,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "rS": {
    "texture": "skins",
    "x": 4014,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "rT": {
    "texture": "skins",
    "x": 2518,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "rU": {
    "texture": "skins",
    "x": 1906,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "rV": {
    "texture": "skins",
    "x": 410,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "rW": {
    "texture": "skins",
    "x": 2586,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "rX": {
    "texture": "skins",
    "x": 3786,
    "y": 994,
    "w": 32,
    "h": 32
  },
  "rY": {
    "texture": "skins",
    "x": 3606,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "rZ": {
    "texture": "skins",
    "x": 1022,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "ra": {
    "texture": "wear",
    "x": 249,
    "y": 2009,
    "w": 17,
    "h": 34,
    "px": 105.5,
    "py": 65,
    "pw": 128,
    "ph": 128
  },
  "rb": {
    "texture": "wear",
    "x": 1126,
    "y": 554,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "rc": {
    "texture": "wear",
    "x": 1044,
    "y": 568,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "rd": {
    "texture": "wear",
    "x": 1418,
    "y": 1566,
    "w": 34,
    "h": 136,
    "px": 1,
    "py": 68,
    "pw": 128,
    "ph": 128
  },
  "re": {
    "texture": "wear",
    "x": 1400,
    "y": 1082,
    "w": 48,
    "h": 128,
    "px": 73,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "s": {
    "texture": "portions",
    "x": 382,
    "y": 119,
    "w": 58,
    "h": 52,
    "px": 32,
    "py": 31,
    "pw": 64,
    "ph": 64
  },
  "sB": {
    "texture": "skins",
    "x": 1498,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "sC": {
    "texture": "skins",
    "x": 886,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "sD": {
    "texture": "skins",
    "x": 2314,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "sE": {
    "texture": "skins",
    "x": 1566,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "sF": {
    "texture": "skins",
    "x": 682,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "sG": {
    "texture": "skins",
    "x": 1906,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "sH": {
    "texture": "skins",
    "x": 3198,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "sI": {
    "texture": "skins",
    "x": 410,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "sJ": {
    "texture": "skins",
    "x": 138,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "sK": {
    "texture": "skins",
    "x": 2314,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "sL": {
    "texture": "skins",
    "x": 886,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "sM": {
    "texture": "skins",
    "x": 1430,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "sN": {
    "texture": "skins",
    "x": 2722,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "sO": {
    "texture": "skins",
    "x": 1566,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "sP": {
    "texture": "skins",
    "x": 1634,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "sQ": {
    "texture": "skins",
    "x": 2042,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "sR": {
    "texture": "skins",
    "x": 2926,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "sS": {
    "texture": "skins",
    "x": 1362,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "sT": {
    "texture": "skins",
    "x": 2722,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "sU": {
    "texture": "skins",
    "x": 1430,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "sV": {
    "texture": "skins",
    "x": 1226,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "sW": {
    "texture": "skins",
    "x": 2994,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "sX": {
    "texture": "skins",
    "x": 3354,
    "y": 954,
    "w": 32,
    "h": 32
  },
  "sY": {
    "texture": "skins",
    "x": 2246,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "sZ": {
    "texture": "skins",
    "x": 1158,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "sa": {
    "texture": "wear",
    "x": 870,
    "y": 1040,
    "w": 15,
    "h": 39,
    "px": 112.5,
    "py": 65.5,
    "pw": 128,
    "ph": 128
  },
  "sb": {
    "texture": "wear",
    "x": 1163,
    "y": 838,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "sc": {
    "texture": "wear",
    "x": 1044,
    "y": 430,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "sd": {
    "texture": "wear",
    "x": 406,
    "y": 1849,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "se": {
    "texture": "wear",
    "x": 1431,
    "y": 946,
    "w": 48,
    "h": 128,
    "px": 73,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "t": {
    "texture": "portions",
    "x": 318,
    "y": 136,
    "w": 58,
    "h": 52,
    "px": 32,
    "py": 31,
    "pw": 64,
    "ph": 64
  },
  "tB": {
    "texture": "skins",
    "x": 2994,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "tC": {
    "texture": "skins",
    "x": 2314,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "tD": {
    "texture": "skins",
    "x": 954,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "tE": {
    "texture": "skins",
    "x": 3606,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "tF": {
    "texture": "skins",
    "x": 2654,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "tG": {
    "texture": "skins",
    "x": 1090,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "tH": {
    "texture": "skins",
    "x": 2110,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "tI": {
    "texture": "skins",
    "x": 1838,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "tJ": {
    "texture": "skins",
    "x": 3334,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "tK": {
    "texture": "skins",
    "x": 1226,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "tL": {
    "texture": "skins",
    "x": 2790,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "tM": {
    "texture": "skins",
    "x": 2178,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "tN": {
    "texture": "skins",
    "x": 2178,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "tO": {
    "texture": "skins",
    "x": 1090,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "tP": {
    "texture": "skins",
    "x": 2314,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "tQ": {
    "texture": "skins",
    "x": 3810,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "tR": {
    "texture": "skins",
    "x": 546,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "tS": {
    "texture": "skins",
    "x": 1702,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "tT": {
    "texture": "skins",
    "x": 70,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "tU": {
    "texture": "skins",
    "x": 3470,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "tV": {
    "texture": "skins",
    "x": 410,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "tW": {
    "texture": "skins",
    "x": 2586,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "tX": {
    "texture": "skins",
    "x": 3354,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "tY": {
    "texture": "skins",
    "x": 206,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "tZ": {
    "texture": "skins",
    "x": 3878,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "ta": {
    "texture": "wear",
    "x": 1576,
    "y": 518,
    "w": 23,
    "h": 63,
    "px": 107.5,
    "py": 63.5,
    "pw": 128,
    "ph": 128
  },
  "tb": {
    "texture": "wear",
    "x": 1202,
    "y": 554,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "tc": {
    "texture": "wear",
    "x": 1134,
    "y": 2,
    "w": 78,
    "h": 134,
    "px": 22,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "td": {
    "texture": "wear",
    "x": 657,
    "y": 1422,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "te": {
    "texture": "wear",
    "x": 1439,
    "y": 1940,
    "w": 44,
    "h": 100,
    "px": 74,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "u": {
    "texture": "portions",
    "x": 262,
    "y": 126,
    "w": 52,
    "h": 62,
    "px": 33,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "uB": {
    "texture": "skins",
    "x": 1362,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "uC": {
    "texture": "skins",
    "x": 3402,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "uD": {
    "texture": "skins",
    "x": 1974,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "uE": {
    "texture": "skins",
    "x": 2926,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "uF": {
    "texture": "skins",
    "x": 1702,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "uG": {
    "texture": "skins",
    "x": 3742,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "uH": {
    "texture": "skins",
    "x": 750,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "uI": {
    "texture": "skins",
    "x": 206,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "uJ": {
    "texture": "skins",
    "x": 4014,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "uK": {
    "texture": "skins",
    "x": 3606,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "uL": {
    "texture": "skins",
    "x": 682,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "uM": {
    "texture": "skins",
    "x": 274,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "uN": {
    "texture": "skins",
    "x": 1226,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "uO": {
    "texture": "skins",
    "x": 274,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "uP": {
    "texture": "skins",
    "x": 1022,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "uQ": {
    "texture": "skins",
    "x": 1430,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "uR": {
    "texture": "skins",
    "x": 1498,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "uS": {
    "texture": "skins",
    "x": 2790,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "uT": {
    "texture": "skins",
    "x": 2450,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "uU": {
    "texture": "skins",
    "x": 1430,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "uV": {
    "texture": "skins",
    "x": 2,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "uW": {
    "texture": "skins",
    "x": 2926,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "uX": {
    "texture": "skins",
    "x": 3858,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "uY": {
    "texture": "skins",
    "x": 886,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "uZ": {
    "texture": "skins",
    "x": 206,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "ua": {
    "texture": "wear",
    "x": 1303,
    "y": 1374,
    "w": 11,
    "h": 12,
    "px": 118.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ub": {
    "texture": "wear",
    "x": 1126,
    "y": 412,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "uc": {
    "texture": "wear",
    "x": 670,
    "y": 1256,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "ud": {
    "texture": "wear",
    "x": 1488,
    "y": 784,
    "w": 34,
    "h": 136,
    "px": 1,
    "py": 68,
    "pw": 128,
    "ph": 128
  },
  "ue": {
    "texture": "wear",
    "x": 1364,
    "y": 676,
    "w": 56,
    "h": 132,
    "px": 74,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "v": {
    "texture": "portions",
    "x": 197,
    "y": 132,
    "w": 52,
    "h": 62,
    "px": 33,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "vB": {
    "texture": "skins",
    "x": 2790,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "vC": {
    "texture": "skins",
    "x": 1090,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "vD": {
    "texture": "skins",
    "x": 1702,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "vE": {
    "texture": "skins",
    "x": 342,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "vF": {
    "texture": "skins",
    "x": 342,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "vG": {
    "texture": "skins",
    "x": 478,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "vH": {
    "texture": "skins",
    "x": 2926,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "vI": {
    "texture": "skins",
    "x": 818,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "vJ": {
    "texture": "skins",
    "x": 2314,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "vK": {
    "texture": "skins",
    "x": 2246,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "vL": {
    "texture": "skins",
    "x": 1702,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "vM": {
    "texture": "skins",
    "x": 410,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "vN": {
    "texture": "skins",
    "x": 2246,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "vO": {
    "texture": "skins",
    "x": 1294,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "vP": {
    "texture": "skins",
    "x": 954,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "vQ": {
    "texture": "skins",
    "x": 3130,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "vR": {
    "texture": "skins",
    "x": 2858,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "vS": {
    "texture": "skins",
    "x": 1294,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "vT": {
    "texture": "skins",
    "x": 750,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "vU": {
    "texture": "skins",
    "x": 1294,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "vV": {
    "texture": "skins",
    "x": 2110,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "vW": {
    "texture": "skins",
    "x": 2994,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "vX": {
    "texture": "skins",
    "x": 3742,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "vY": {
    "texture": "skins",
    "x": 2450,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "vZ": {
    "texture": "skins",
    "x": 750,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "va": {
    "texture": "wear",
    "x": 1054,
    "y": 1057,
    "w": 17,
    "h": 32,
    "px": 113.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "vb": {
    "texture": "wear",
    "x": 1212,
    "y": 696,
    "w": 72,
    "h": 138,
    "px": 113,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "vc": {
    "texture": "wear",
    "x": 886,
    "y": 1224,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "vd": {
    "texture": "wear",
    "x": 551,
    "y": 1609,
    "w": 122,
    "h": 166,
    "px": 33,
    "py": 67,
    "pw": 128,
    "ph": 128
  },
  "ve": {
    "texture": "wear",
    "x": 1146,
    "y": 1514,
    "w": 56,
    "h": 132,
    "px": 74,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "w": {
    "texture": "portions",
    "x": 262,
    "y": 68,
    "w": 61,
    "h": 54,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "wB": {
    "texture": "skins",
    "x": 1022,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "wC": {
    "texture": "skins",
    "x": 3130,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "wD": {
    "texture": "skins",
    "x": 1838,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "wE": {
    "texture": "skins",
    "x": 2518,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "wF": {
    "texture": "skins",
    "x": 2246,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "wG": {
    "texture": "skins",
    "x": 614,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "wH": {
    "texture": "skins",
    "x": 886,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "wI": {
    "texture": "skins",
    "x": 1158,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "wJ": {
    "texture": "skins",
    "x": 2722,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "wK": {
    "texture": "skins",
    "x": 3674,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "wL": {
    "texture": "skins",
    "x": 1294,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "wM": {
    "texture": "skins",
    "x": 2858,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "wN": {
    "texture": "skins",
    "x": 2042,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "wO": {
    "texture": "skins",
    "x": 1498,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "wP": {
    "texture": "skins",
    "x": 886,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "wQ": {
    "texture": "skins",
    "x": 2518,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "wR": {
    "texture": "skins",
    "x": 3130,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "wS": {
    "texture": "skins",
    "x": 2586,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "wT": {
    "texture": "skins",
    "x": 614,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "wU": {
    "texture": "skins",
    "x": 1974,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "wV": {
    "texture": "skins",
    "x": 2314,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "wW": {
    "texture": "skins",
    "x": 3538,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "wX": {
    "texture": "skins",
    "x": 2994,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "wY": {
    "texture": "skins",
    "x": 1634,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "wZ": {
    "texture": "skins",
    "x": 1430,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "wa": {
    "texture": "wear",
    "x": 1585,
    "y": 784,
    "w": 11,
    "h": 32,
    "px": 114.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "wb": {
    "texture": "wear",
    "x": 1320,
    "y": 1298,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "wc": {
    "texture": "wear",
    "x": 795,
    "y": 298,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "wd": {
    "texture": "wear",
    "x": 482,
    "y": 603,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "we": {
    "texture": "wear",
    "x": 981,
    "y": 292,
    "w": 56,
    "h": 132,
    "px": 74,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "x": {
    "texture": "portions",
    "x": 388,
    "y": 61,
    "w": 61,
    "h": 54,
    "px": 32.5,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "xB": {
    "texture": "skins",
    "x": 2858,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "xC": {
    "texture": "skins",
    "x": 682,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "xD": {
    "texture": "skins",
    "x": 3266,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "xE": {
    "texture": "skins",
    "x": 1566,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "xF": {
    "texture": "skins",
    "x": 4014,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "xG": {
    "texture": "skins",
    "x": 1702,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "xH": {
    "texture": "skins",
    "x": 546,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "xI": {
    "texture": "skins",
    "x": 2042,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "xJ": {
    "texture": "skins",
    "x": 3822,
    "y": 922,
    "w": 32,
    "h": 32
  },
  "xK": {
    "texture": "skins",
    "x": 70,
    "y": 1090,
    "w": 64,
    "h": 64
  },
  "xL": {
    "texture": "skins",
    "x": 4014,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "xM": {
    "texture": "skins",
    "x": 3402,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "xN": {
    "texture": "skins",
    "x": 1226,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "xO": {
    "texture": "skins",
    "x": 546,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "xP": {
    "texture": "skins",
    "x": 682,
    "y": 274,
    "w": 64,
    "h": 64
  },
  "xQ": {
    "texture": "skins",
    "x": 1430,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "xR": {
    "texture": "skins",
    "x": 818,
    "y": 1498,
    "w": 64,
    "h": 64
  },
  "xS": {
    "texture": "skins",
    "x": 2314,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "xT": {
    "texture": "skins",
    "x": 1906,
    "y": 954,
    "w": 64,
    "h": 64
  },
  "xU": {
    "texture": "skins",
    "x": 2,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "xV": {
    "texture": "skins",
    "x": 1294,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "xW": {
    "texture": "skins",
    "x": 1838,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "xX": {
    "texture": "skins",
    "x": 2110,
    "y": 1770,
    "w": 64,
    "h": 64
  },
  "xY": {
    "texture": "skins",
    "x": 818,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "xZ": {
    "texture": "skins",
    "x": 3246,
    "y": 990,
    "w": 32,
    "h": 32
  },
  "xa": {
    "texture": "wear",
    "x": 1017,
    "y": 873,
    "w": 23,
    "h": 73,
    "px": 108.5,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "xb": {
    "texture": "wear",
    "x": 1259,
    "y": 1925,
    "w": 31,
    "h": 32,
    "px": 138.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "xc": {
    "texture": "wear",
    "x": 898,
    "y": 1365,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "xd": {
    "texture": "wear",
    "x": 257,
    "y": 1382,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "xe": {
    "texture": "wear",
    "x": 1359,
    "y": 398,
    "w": 79,
    "h": 116,
    "px": 56.5,
    "py": 69,
    "pw": 128,
    "ph": 128
  },
  "y": {
    "texture": "portions",
    "x": 385,
    "y": 238,
    "w": 46,
    "h": 58,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "yB": {
    "texture": "skins",
    "x": 1770,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "yC": {
    "texture": "skins",
    "x": 4014,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "yD": {
    "texture": "skins",
    "x": 1702,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "yE": {
    "texture": "skins",
    "x": 1906,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "yF": {
    "texture": "skins",
    "x": 818,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "yG": {
    "texture": "skins",
    "x": 2790,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "yH": {
    "texture": "skins",
    "x": 1090,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "yI": {
    "texture": "skins",
    "x": 2586,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "yJ": {
    "texture": "skins",
    "x": 3198,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "yK": {
    "texture": "skins",
    "x": 1566,
    "y": 1226,
    "w": 64,
    "h": 64
  },
  "yL": {
    "texture": "skins",
    "x": 2178,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "yM": {
    "texture": "skins",
    "x": 2858,
    "y": 1158,
    "w": 64,
    "h": 64
  },
  "yN": {
    "texture": "skins",
    "x": 274,
    "y": 1702,
    "w": 64,
    "h": 64
  },
  "yO": {
    "texture": "skins",
    "x": 2790,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "yP": {
    "texture": "skins",
    "x": 2178,
    "y": 1838,
    "w": 64,
    "h": 64
  },
  "yQ": {
    "texture": "skins",
    "x": 1974,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "yR": {
    "texture": "skins",
    "x": 954,
    "y": 1294,
    "w": 64,
    "h": 64
  },
  "yS": {
    "texture": "skins",
    "x": 1294,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "yT": {
    "texture": "skins",
    "x": 3742,
    "y": 342,
    "w": 64,
    "h": 64
  },
  "yU": {
    "texture": "skins",
    "x": 3334,
    "y": 478,
    "w": 64,
    "h": 64
  },
  "yV": {
    "texture": "skins",
    "x": 886,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "yW": {
    "texture": "skins",
    "x": 1090,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "yX": {
    "texture": "skins",
    "x": 342,
    "y": 1362,
    "w": 64,
    "h": 64
  },
  "yY": {
    "texture": "skins",
    "x": 342,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "yZ": {
    "texture": "skins",
    "x": 3786,
    "y": 886,
    "w": 32,
    "h": 32
  },
  "ya": {
    "texture": "wear",
    "x": 531,
    "y": 1609,
    "w": 15,
    "h": 72,
    "px": 102.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "yb": {
    "texture": "wear",
    "x": 1362,
    "y": 1932,
    "w": 41,
    "h": 32,
    "px": 131.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "yc": {
    "texture": "wear",
    "x": 916,
    "y": 1506,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "yd": {
    "texture": "wear",
    "x": 498,
    "y": 450,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ye": {
    "texture": "wear",
    "x": 1529,
    "y": 607,
    "w": 34,
    "h": 92,
    "px": 75,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "z": {
    "texture": "portions",
    "x": 200,
    "y": 2,
    "w": 60,
    "h": 60,
    "px": 32,
    "py": 32,
    "pw": 64,
    "ph": 64
  },
  "zB": {
    "texture": "skins",
    "x": 1838,
    "y": 70,
    "w": 64,
    "h": 64
  },
  "zC": {
    "texture": "skins",
    "x": 2994,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "zD": {
    "texture": "skins",
    "x": 1158,
    "y": 1634,
    "w": 64,
    "h": 64
  },
  "zE": {
    "texture": "skins",
    "x": 138,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "zF": {
    "texture": "skins",
    "x": 1770,
    "y": 138,
    "w": 64,
    "h": 64
  },
  "zG": {
    "texture": "skins",
    "x": 546,
    "y": 410,
    "w": 64,
    "h": 64
  },
  "zH": {
    "texture": "skins",
    "x": 818,
    "y": 1022,
    "w": 64,
    "h": 64
  },
  "zI": {
    "texture": "skins",
    "x": 3742,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "zJ": {
    "texture": "skins",
    "x": 3062,
    "y": 886,
    "w": 64,
    "h": 64
  },
  "zK": {
    "texture": "skins",
    "x": 2790,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "zL": {
    "texture": "skins",
    "x": 478,
    "y": 206,
    "w": 64,
    "h": 64
  },
  "zM": {
    "texture": "skins",
    "x": 2586,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "zN": {
    "texture": "skins",
    "x": 954,
    "y": 1974,
    "w": 64,
    "h": 64
  },
  "zO": {
    "texture": "skins",
    "x": 274,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "zP": {
    "texture": "skins",
    "x": 478,
    "y": 1906,
    "w": 64,
    "h": 64
  },
  "zQ": {
    "texture": "skins",
    "x": 2586,
    "y": 750,
    "w": 64,
    "h": 64
  },
  "zR": {
    "texture": "skins",
    "x": 886,
    "y": 1430,
    "w": 64,
    "h": 64
  },
  "zS": {
    "texture": "skins",
    "x": 1906,
    "y": 614,
    "w": 64,
    "h": 64
  },
  "zT": {
    "texture": "skins",
    "x": 1906,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "zU": {
    "texture": "skins",
    "x": 1498,
    "y": 818,
    "w": 64,
    "h": 64
  },
  "zV": {
    "texture": "skins",
    "x": 4014,
    "y": 2,
    "w": 64,
    "h": 64
  },
  "zW": {
    "texture": "skins",
    "x": 1906,
    "y": 546,
    "w": 64,
    "h": 64
  },
  "zX": {
    "texture": "skins",
    "x": 954,
    "y": 682,
    "w": 64,
    "h": 64
  },
  "zY": {
    "texture": "skins",
    "x": 954,
    "y": 1566,
    "w": 64,
    "h": 64
  },
  "zZ": {
    "texture": "skins",
    "x": 3750,
    "y": 958,
    "w": 32,
    "h": 32
  },
  "za": {
    "texture": "wear",
    "x": 489,
    "y": 1439,
    "w": 23,
    "h": 72,
    "px": 107.5,
    "py": 63,
    "pw": 128,
    "ph": 128
  },
  "zb": {
    "texture": "wear",
    "x": 1375,
    "y": 948,
    "w": 52,
    "h": 130,
    "px": 100,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "zc": {
    "texture": "wear",
    "x": 851,
    "y": 140,
    "w": 100,
    "h": 137,
    "px": 22,
    "py": 64.5,
    "pw": 128,
    "ph": 128
  },
  "zd": {
    "texture": "wear",
    "x": 470,
    "y": 949,
    "w": 148,
    "h": 148,
    "px": 53,
    "py": 64,
    "pw": 128,
    "ph": 128
  },
  "ze": {
    "texture": "wear",
    "x": 1480,
    "y": 652,
    "w": 45,
    "h": 128,
    "px": 74.5,
    "py": 64,
    "pw": 128,
    "ph": 128
  }
} as const;
