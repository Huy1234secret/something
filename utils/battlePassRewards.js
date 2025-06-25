const REWARDS = [
    // Level 0
    [{ currency: 'coins', amount: 100 }],
    // Level 1
    [{ item: 'common_loot_box', amount: 1 }],
    // Level 2
    [{ currency: 'coins', amount: 200 }],
    // Level 3
    [{ currency: 'gems', amount: 50 }],
    // Level 4
    [{ item: 'daily_skip_ticket', amount: 1 }],
    // Level 5
    [{ item: 'rare_loot_box', amount: 1 }],
    // Level 6
    [{ currency: 'coins', amount: 300 }],
    // Level 7
    [{ item: 'discount_ticket_10', amount: 1 }],
    // Level 8
    [{ item: 'common_loot_box', amount: 2 }],
    // Level 9
    [{ currency: 'gems', amount: 100 }],
    // Level 10
    [{ item: 'epic_loot_box', amount: 1 }],
    // Level 11
    [{ currency: 'coins', amount: 400 }],
    // Level 12
    [{ item: 'daily_skip_ticket', amount: 2 }],
    // Level 13
    [{ item: 'rare_loot_box', amount: 1 }],
    // Level 14
    [{ currency: 'gems', amount: 150 }],
    // Level 15
    [{ item: 'common_loot_box', amount: 3 }],
    // Level 16
    [{ currency: 'coins', amount: 500 }],
    // Level 17
    [{ item: 'discount_ticket_25', amount: 1 }],
    // Level 18
    [{ item: 'rare_loot_box', amount: 2 }],
    // Level 19
    [{ currency: 'gems', amount: 200 }],
    // Level 20
    [{ item: 'legendary_loot_box', amount: 1 }],
    // Level 21
    [{ currency: 'coins', amount: 600 }],
    // Level 22
    [{ item: 'daily_skip_ticket', amount: 3 }],
    // Level 23
    [{ item: 'epic_loot_box', amount: 1 }],
    // Level 24
    [{ currency: 'gems', amount: 250 }],
    // Level 25
    [{ item: 'magic_chest', amount: 1 }],
    // Level 26
    [{ currency: 'coins', amount: 700 }],
    // Level 27
    [{ item: 'discount_ticket_10', amount: 2 }],
    // Level 28
    [{ item: 'rare_loot_box', amount: 3 }],
    // Level 29
    [{ currency: 'gems', amount: 300 }],
    // Level 30
    [{ item: 'mythical_chest', amount: 1 }],
    // Level 31
    [{ currency: 'coins', amount: 800 }],
    // Level 32
    [{ item: 'daily_skip_ticket', amount: 4 }],
    // Level 33
    [{ item: 'epic_loot_box', amount: 2 }],
    // Level 34
    [{ currency: 'gems', amount: 350 }],
    // Level 35
    [{ item: 'common_loot_box', amount: 5 }],
    // Level 36
    [{ currency: 'coins', amount: 900 }],
    // Level 37
    [{ item: 'discount_ticket_25', amount: 2 }],
    // Level 38
    [{ item: 'rare_loot_box', amount: 4 }],
    // Level 39
    [{ currency: 'gems', amount: 400 }],
    // Level 40
    [{ item: 'legendary_loot_box', amount: 2 }],
    // Level 41
    [{ currency: 'coins', amount: 1000 }],
    // Level 42
    [{ item: 'daily_skip_ticket', amount: 5 }],
    // Level 43
    [{ item: 'epic_loot_box', amount: 3 }],
    // Level 44
    [{ currency: 'gems', amount: 450 }],
    // Level 45
    [{ item: 'magic_chest', amount: 2 }],
    // Level 46
    [{ currency: 'coins', amount: 1250 }],
    // Level 47
    [{ item: 'discount_ticket_50', amount: 1 }],
    // Level 48
    [{ item: 'rare_loot_box', amount: 5 }],
    // Level 49
    [{ currency: 'gems', amount: 500 }],
    // Level 50
    [{ item: 'mythical_chest', amount: 2 }],
    // Level 51
    [{ currency: 'coins', amount: 1500 }],
    // Level 52
    [{ item: 'daily_skip_ticket', amount: 6 }],
    // Level 53
    [{ item: 'epic_loot_box', amount: 4 }],
    // Level 54
    [{ currency: 'gems', amount: 550 }],
    // Level 55
    [{ item: 'gem_chest', amount: 1 }],
    // Level 56
    [{ currency: 'coins', amount: 1750 }],
    // Level 57
    [{ item: 'discount_ticket_10', amount: 3 }],
    // Level 58
    [{ item: 'legendary_loot_box', amount: 3 }],
    // Level 59
    [{ currency: 'gems', amount: 600 }],
    // Level 60
    [{ item: 'magic_chest', amount: 3 }],
    // Level 61
    [{ currency: 'coins', amount: 2000 }],
    // Level 62
    [{ item: 'daily_skip_ticket', amount: 7 }],
    // Level 63
    [{ item: 'epic_loot_box', amount: 5 }],
    // Level 64
    [{ currency: 'gems', amount: 650 }],
    // Level 65
    [{ item: 'mythical_chest', amount: 3 }],
    // Level 66
    [{ currency: 'coins', amount: 2250 }],
    // Level 67
    [{ item: 'discount_ticket_25', amount: 3 }],
    // Level 68
    [{ item: 'rare_loot_box', amount: 10 }],
    // Level 69
    [{ currency: 'gems', amount: 700 }],
    // Level 70
    [{ item: 'legendary_loot_box', amount: 4 }],
    // Level 71
    [{ currency: 'coins', amount: 2500 }],
    // Level 72
    [{ item: 'daily_skip_ticket', amount: 8 }],
    // Level 73
    [{ item: 'epic_loot_box', amount: 6 }],
    // Level 74
    [{ currency: 'gems', amount: 750 }],
    // Level 75
    [{ item: 'gem_chest', amount: 2 }],
    // Level 76
    [{ currency: 'coins', amount: 3000 }],
    // Level 77
    [{ item: 'discount_ticket_50', amount: 2 }],
    // Level 78
    [{ item: 'mythical_chest', amount: 4 }],
    // Level 79
    [{ currency: 'gems', amount: 800 }],
    // Level 80
    [{ item: 'magic_chest', amount: 4 }],
    // Level 81
    [{ currency: 'coins', amount: 3500 }],
    // Level 82
    [{ item: 'daily_skip_ticket', amount: 9 }],
    // Level 83
    [{ item: 'legendary_loot_box', amount: 5 }],
    // Level 84
    [{ currency: 'gems', amount: 850 }],
    // Level 85
    [{ item: 'epic_loot_box', amount: 10 }],
    // Level 86
    [{ currency: 'coins', amount: 4000 }],
    // Level 87
    [{ item: 'discount_ticket_100', amount: 1 }],
    // Level 88
    [{ item: 'mythical_chest', amount: 5 }],
    // Level 89
    [{ currency: 'gems', amount: 900 }],
    // Level 90
    [{ item: 'gem_chest', amount: 3 }],
    // Level 91
    [{ currency: 'coins', amount: 4500 }],
    // Level 92
    [{ item: 'daily_skip_ticket', amount: 10 }],
    // Level 93
    [{ item: 'legendary_loot_box', amount: 6 }],
    // Level 94
    [{ currency: 'gems', amount: 950 }],
    // Level 95
    [{ item: 'magic_chest', amount: 5 }],
    // Level 96
    [{ currency: 'coins', amount: 5000 }],
    // Level 97
    [{ item: 'mythical_chest', amount: 6 }],
    // Level 98
    [{ currency: 'gems', amount: 1000 }],
    // Level 99
    [{ item: 'void_chest', amount: 1 }],
    // Level 100
    [
        { currency: 'coins', amount: 10000 },
        { currency: 'gems', amount: 2500 },
        { currency: 'robux', amount: 500 },
        { item: 'void_chest', amount: 2 },
        { item: 'discount_ticket_100', amount: 2 },
        { item: 'inf_chest', amount: 1 },
        { role: '1387090298873708554' }
    ]
];

module.exports = REWARDS;
