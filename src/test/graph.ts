import { NewGraph } from "src/usecase/builtGraph";

export const testNewGraph: NewGraph = {
    III: [
      { to: 'HHH', travelTime: 332, stayTime: 5400 },
      { to: 'FFF', travelTime: 2360, stayTime: 3600 },
      { to: 'AAA', travelTime: 2613, stayTime: 5400 },
      { to: 'GGG', travelTime: 2958, stayTime: 3600 },
      { to: 'CCC', travelTime: 3844, stayTime: 5400 },
      { to: 'EEE', travelTime: 4992, stayTime: 5400 },
      { to: 'DDD', travelTime: 4078, stayTime: 5400 },
      { to: 'BBB', travelTime: 5401, stayTime: 0 }
    ],
    HHH: [
      { to: 'III', travelTime: 346, stayTime: 0 },
      { to: 'FFF', travelTime: 2489, stayTime: 3600 },
      { to: 'GGG', travelTime: 3112, stayTime: 3600 },
      { to: 'AAA', travelTime: 2770, stayTime: 5400 },
      { to: 'CCC', travelTime: 4096, stayTime: 5400 },
      { to: 'DDD', travelTime: 4273, stayTime: 5400 },
      { to: 'EEE', travelTime: 4704, stayTime: 5400 },
      { to: 'BBB', travelTime: 5168, stayTime: 0 }
    ],
    AAA: [
      { to: 'FFF', travelTime: 544, stayTime: 3600 },
      { to: 'GGG', travelTime: 779, stayTime: 3600 },
      { to: 'DDD', travelTime: 1952, stayTime: 5400 },
      { to: 'III', travelTime: 2354, stayTime: 0 },
      { to: 'HHH', travelTime: 2445, stayTime: 5400 },
      { to: 'CCC', travelTime: 2763, stayTime: 5400 },
      { to: 'EEE', travelTime: 5509, stayTime: 5400 },
      { to: 'BBB', travelTime: 6212, stayTime: 0 }
    ],
    GGG: [
      { to: 'AAA', travelTime: 737, stayTime: 5400 },
      { to: 'FFF', travelTime: 1264, stayTime: 3600 },
      { to: 'DDD', travelTime: 1437, stayTime: 5400 },
      { to: 'CCC', travelTime: 2540, stayTime: 5400 },
      { to: 'III', travelTime: 3000, stayTime: 0 },
      { to: 'HHH', travelTime: 3049, stayTime: 5400 },
      { to: 'EEE', travelTime: 6574, stayTime: 5400 },
      { to: 'BBB', travelTime: 6966, stayTime: 0 }
    ],
    FFF: [
      { to: 'AAA', travelTime: 1059, stayTime: 5400 },
      { to: 'GGG', travelTime: 1152, stayTime: 3600 },
      { to: 'III', travelTime: 2243, stayTime: 0 },
      { to: 'DDD', travelTime: 2330, stayTime: 5400 },
      { to: 'HHH', travelTime: 2293, stayTime: 5400 },
      { to: 'CCC', travelTime: 2965, stayTime: 5400 },
      { to: 'EEE', travelTime: 5234, stayTime: 5400 },
      { to: 'BBB', travelTime: 5727, stayTime: 0 }
    ],
    DDD: [
      { to: 'AAA', travelTime: 1824, stayTime: 5400 },
      { to: 'GGG', travelTime: 1439, stayTime: 3600 },
      { to: 'FFF', travelTime: 2356, stayTime: 3600 },
      { to: 'CCC', travelTime: 3173, stayTime: 5400 },
      { to: 'III', travelTime: 4067, stayTime: 0 },
      { to: 'HHH', travelTime: 4148, stayTime: 5400 },
      { to: 'EEE', travelTime: 7639, stayTime: 5400 },
      { to: 'BBB', travelTime: 8042, stayTime: 0 }
    ],
    CCC: [
      { to: 'DDD', travelTime: 3173, stayTime: 5400 },
      { to: 'GGG', travelTime: 2385, stayTime: 3600 },
      { to: 'HHH', travelTime: 3827, stayTime: 5400 },
      { to: 'FFF', travelTime: 2884, stayTime: 3600 },
      { to: 'AAA', travelTime: 2517, stayTime: 5400 },
      { to: 'III', travelTime: 3803, stayTime: 0 },
      { to: 'EEE', travelTime: 7295, stayTime: 5400 },
      { to: 'BBB', travelTime: 7694, stayTime: 0 }
    ],
    EEE: [
      { to: 'HHH', travelTime: 4896, stayTime: 5400 },
      { to: 'FFF', travelTime: 5214, stayTime: 3600 },
      { to: 'III', travelTime: 5089, stayTime: 0 },
      { to: 'GGG', travelTime: 6673, stayTime: 3600 },
      { to: 'AAA', travelTime: 6136, stayTime: 5400 },
      { to: 'DDD', travelTime: 7929, stayTime: 5400 },
      { to: 'CCC', travelTime: 7527, stayTime: 5400 },
      { to: 'BBB', travelTime: 5198, stayTime: 0 }
    ],
    BBB: [
      { to: 'HHH', travelTime: 5718, stayTime: 5400 },
      { to: 'EEE', travelTime: 5473, stayTime: 5400 },
      { to: 'III', travelTime: 6170, stayTime: 0 },
      { to: 'FFF', travelTime: 6317, stayTime: 3600 },
      { to: 'CCC', travelTime: 8140, stayTime: 5400 },
      { to: 'AAA', travelTime: 6755, stayTime: 5400 },
      { to: 'DDD', travelTime: 8535, stayTime: 5400 },
      { to: 'GGG', travelTime: 7279, stayTime: 3600 }
    ]
  }