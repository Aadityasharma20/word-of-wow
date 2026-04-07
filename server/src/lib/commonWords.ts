/**
 * Common English Dictionary Words
 * 
 * A curated list of English words that could also be brand names.
 * Used to detect when a brand name is a common dictionary word,
 * so we can apply contextual disambiguation to filter out mentions
 * that use the word literally (not referring to the brand).
 * 
 * This is a LOCAL check — no API call needed.
 */

// ~1500 common English words that are also potential brand names
// Focused on nouns, adjectives, and verbs that brands commonly use
export const COMMON_ENGLISH_WORDS = new Set([
    // Animals
    'ant', 'ape', 'bat', 'bear', 'bee', 'bird', 'bull', 'cat', 'cheetah',
    'cobra', 'crane', 'crow', 'deer', 'dog', 'dolphin', 'dove', 'dragon',
    'eagle', 'falcon', 'fish', 'fox', 'frog', 'gazelle', 'goat', 'hawk',
    'horse', 'jaguar', 'leopard', 'lion', 'lynx', 'monkey', 'mustang',
    'owl', 'panther', 'parrot', 'penguin', 'phoenix', 'puma', 'python',
    'rabbit', 'raven', 'robin', 'salmon', 'shark', 'snake', 'sparrow',
    'spider', 'stallion', 'swan', 'tiger', 'turtle', 'viper', 'wolf',
    'zebra',

    // Fruits & Plants
    'apple', 'banana', 'berry', 'blossom', 'bloom', 'cherry', 'clover',
    'coconut', 'fig', 'flora', 'forest', 'garden', 'grape', 'ivy',
    'jasmine', 'lemon', 'lily', 'lotus', 'mango', 'maple', 'mint',
    'oak', 'olive', 'orange', 'palm', 'peach', 'pear', 'pine',
    'plum', 'poppy', 'rose', 'sage', 'seed', 'sprout', 'thorn',
    'tree', 'tulip', 'vine', 'violet', 'willow',

    // Nature & Elements
    'air', 'ash', 'aurora', 'avalanche', 'bay', 'beach', 'blaze',
    'boulder', 'breeze', 'brook', 'canyon', 'cascade', 'cave', 'cliff',
    'cloud', 'coast', 'coral', 'creek', 'crystal', 'current', 'dawn',
    'desert', 'dew', 'drift', 'dune', 'dust', 'earth', 'ember',
    'field', 'fire', 'flame', 'flood', 'flow', 'fog', 'frost',
    'gale', 'gem', 'glacier', 'glow', 'granite', 'grove', 'harbor',
    'haze', 'hill', 'horizon', 'ice', 'island', 'jade', 'lake',
    'lava', 'light', 'lightning', 'marsh', 'meadow', 'mesa', 'mist',
    'moon', 'mountain', 'ocean', 'opal', 'peak', 'pearl', 'pebble',
    'pond', 'prairie', 'rain', 'rainbow', 'rapids', 'reef', 'ridge',
    'ripple', 'river', 'rock', 'sand', 'sea', 'shadow', 'shore',
    'sky', 'slate', 'snow', 'spring', 'star', 'steel', 'stone',
    'storm', 'stream', 'summit', 'sun', 'surf', 'thunder', 'tide',
    'valley', 'volcano', 'water', 'wave', 'wind', 'winter',

    // Colors
    'amber', 'azure', 'black', 'blue', 'bronze', 'brown', 'coral',
    'crimson', 'cyan', 'emerald', 'gold', 'golden', 'green', 'grey',
    'indigo', 'ivory', 'magenta', 'maroon', 'navy', 'pink', 'platinum',
    'purple', 'red', 'ruby', 'rustic', 'scarlet', 'silver', 'teal',
    'turquoise', 'white', 'yellow',

    // Common Objects
    'anchor', 'anvil', 'arch', 'arrow', 'atlas', 'axe', 'badge',
    'banner', 'barrel', 'basket', 'beacon', 'bell', 'blade', 'blanket',
    'block', 'bolt', 'bond', 'book', 'bow', 'box', 'bridge',
    'brush', 'bucket', 'button', 'cable', 'cage', 'candle', 'canvas',
    'cap', 'card', 'castle', 'chain', 'chair', 'chalk', 'charm',
    'chest', 'circle', 'clamp', 'clock', 'coat', 'coil', 'coin',
    'column', 'compass', 'cord', 'corner', 'crown', 'cube', 'cup',
    'curtain', 'cushion', 'dart', 'deck', 'dial', 'diamond', 'dish',
    'door', 'dome', 'drum', 'edge', 'engine', 'fabric', 'fan',
    'feather', 'fence', 'fiber', 'flag', 'flask', 'flute', 'forge',
    'fork', 'frame', 'gate', 'gauge', 'gear', 'glass', 'globe',
    'glove', 'grid', 'grip', 'guard', 'hammer', 'handle', 'harp',
    'hatch', 'helm', 'hinge', 'hook', 'horn', 'hub', 'hull',
    'iron', 'jewel', 'key', 'knot', 'ladder', 'lamp', 'lance',
    'lantern', 'latch', 'lens', 'lever', 'lid', 'line', 'link',
    'lock', 'loom', 'loop', 'magnet', 'mantle', 'map', 'marble',
    'mask', 'match', 'matrix', 'medal', 'mesh', 'mirror', 'mold',
    'nail', 'needle', 'nest', 'net', 'niche', 'node', 'note',
    'oar', 'orb', 'pad', 'pane', 'panel', 'patch', 'path',
    'pedal', 'pen', 'pillar', 'pin', 'pipe', 'plank', 'plate',
    'plug', 'pocket', 'pole', 'post', 'pot', 'pouch', 'prism',
    'probe', 'pulley', 'pump', 'quill', 'rack', 'rail', 'ring',
    'rod', 'rope', 'rudder', 'rug', 'sail', 'scale', 'scroll',
    'seal', 'shelf', 'shell', 'shield', 'slab', 'sleeve', 'sling',
    'slot', 'socket', 'spoke', 'spool', 'spring', 'spur', 'square',
    'staff', 'stake', 'stem', 'stitch', 'strap', 'string', 'stripe',
    'switch', 'sword', 'tab', 'table', 'tag', 'tape', 'thread',
    'tile', 'timber', 'token', 'torch', 'tower', 'track', 'trap',
    'tray', 'trigger', 'tube', 'valve', 'vault', 'veil', 'vessel',
    'vise', 'wall', 'wand', 'wedge', 'wheel', 'wick', 'wing',
    'wire', 'wrench',

    // Abstract Concepts / Qualities
    'ace', 'aura', 'balance', 'bliss', 'bold', 'bond', 'boost',
    'brave', 'bright', 'calm', 'care', 'catalyst', 'center', 'chance',
    'clarity', 'class', 'clear', 'clever', 'code', 'comfort', 'core',
    'craft', 'crest', 'daring', 'dash', 'delight', 'depth', 'design',
    'dream', 'drive', 'echo', 'edge', 'elite', 'embrace', 'emerge',
    'encore', 'energy', 'epic', 'essence', 'ethos', 'evolve', 'exceed',
    'excel', 'express', 'fable', 'flair', 'flash', 'flex', 'flow',
    'focus', 'force', 'fortune', 'forward', 'free', 'fresh', 'frontier',
    'fuel', 'fusion', 'future', 'gaze', 'genius', 'gentle', 'glory',
    'grace', 'grand', 'gravity', 'grow', 'growth', 'guide', 'gust',
    'habit', 'harmony', 'haven', 'heart', 'hero', 'honor', 'hope',
    'hustle', 'idea', 'ignite', 'imagine', 'impact', 'impulse', 'infinite',
    'insight', 'inspire', 'instinct', 'intent', 'journey', 'joy', 'keen',
    'kin', 'kind', 'kindle', 'kinetic', 'knight', 'edge', 'labor',
    'launch', 'lead', 'legacy', 'legend', 'liberty', 'lift', 'logic',
    'lore', 'luck', 'lure', 'magic', 'majesty', 'maker', 'mark',
    'marvel', 'master', 'merit', 'method', 'might', 'mingle', 'mission',
    'mode', 'momentum', 'motive', 'muse', 'native', 'nexus', 'nimble',
    'noble', 'notion', 'nova', 'nurture', 'oath', 'omega', 'omen',
    'onyx', 'opus', 'orbit', 'order', 'origin', 'outpost', 'pace',
    'pact', 'passion', 'path', 'patient', 'patron', 'pause', 'peace',
    'peak', 'pivot', 'pledge', 'plunge', 'point', 'poise', 'portal',
    'power', 'praise', 'premier', 'prestige', 'pride', 'prime',
    'principle', 'progress', 'promise', 'proof', 'prosper', 'prowl',
    'pulse', 'pure', 'pursuit', 'quest', 'quick', 'quiet', 'radiance',
    'rally', 'range', 'rank', 'rapid', 'rare', 'ray', 'reach',
    'realm', 'reason', 'rebel', 'reign', 'relic', 'remedy', 'renew',
    'resolve', 'revival', 'rhythm', 'rise', 'rival', 'root', 'roam',
    'royal', 'rush', 'sacred', 'saga', 'savor', 'scope', 'scout',
    'self', 'sense', 'sentinel', 'serene', 'serve', 'sharp', 'shelter',
    'shift', 'shine', 'signal', 'silk', 'simple', 'singular', 'skill',
    'smart', 'snap', 'soar', 'social', 'solid', 'solo', 'soul',
    'sound', 'source', 'space', 'span', 'spark', 'spectrum', 'speed',
    'sphere', 'spirit', 'splash', 'sprint', 'squad', 'stage', 'stance',
    'standard', 'start', 'status', 'steady', 'stellar', 'step', 'stir',
    'stoic', 'stride', 'strike', 'strong', 'summit', 'super', 'surge',
    'sustain', 'swift', 'sync', 'tactic', 'talent', 'tempo', 'tenacity',
    'thrive', 'titan', 'tone', 'touch', 'trail', 'trait', 'trend',
    'tribe', 'triumph', 'tropic', 'true', 'trust', 'truth', 'tune',
    'twist', 'ultra', 'union', 'unique', 'unite', 'unity', 'uplift',
    'urban', 'valor', 'value', 'vast', 'venture', 'verge', 'verse',
    'vigor', 'virtue', 'vision', 'vista', 'vital', 'vivid', 'voice',
    'vortex', 'voyage', 'wake', 'wander', 'ward', 'wave', 'wealth',
    'weave', 'wild', 'will', 'wisdom', 'wish', 'wonder', 'work',
    'worthy', 'woven', 'zeal', 'zen', 'zenith', 'zero', 'zone',

    // Actions / Verbs commonly used as brands
    'build', 'charge', 'chase', 'climb', 'connect', 'conquer', 'create',
    'crush', 'dare', 'deliver', 'discover', 'elevate', 'encode', 'engage',
    'expand', 'explore', 'fetch', 'gather', 'glide', 'grasp', 'harvest',
    'hunt', 'ignite', 'invent', 'jump', 'launch', 'leap', 'linger',
    'navigate', 'open', 'pioneer', 'plant', 'play', 'pluck', 'pour',
    'propel', 'push', 'race', 'read', 'reap', 'reclaim', 'refine',
    'reform', 'relay', 'render', 'reshape', 'restore', 'reveal', 'ride',
    'rise', 'roar', 'roll', 'run', 'sail', 'save', 'sculpt',
    'search', 'seek', 'shape', 'share', 'skip', 'slice', 'slide',
    'snap', 'solve', 'spin', 'sprout', 'stack', 'stand', 'steer',
    'stop', 'store', 'stretch', 'strive', 'supply', 'sway', 'sweep',
    'tag', 'tap', 'tear', 'test', 'think', 'track', 'trade',
    'train', 'transform', 'travel', 'trek', 'trim', 'turn', 'twist',
    'type', 'unlock', 'vault', 'view', 'visit', 'weld', 'yield',

    // Food & Drink
    'bacon', 'bean', 'bread', 'brew', 'butter', 'cake', 'candy',
    'caramel', 'cellar', 'cider', 'cocoa', 'coffee', 'cookie', 'cream',
    'crisp', 'crumb', 'dough', 'feast', 'fig', 'flour', 'grain',
    'grind', 'harvest', 'herb', 'honey', 'jam', 'juice', 'kernel',
    'nectar', 'noodle', 'nut', 'oat', 'pastry', 'pepper', 'pickle',
    'pie', 'pizza', 'popcorn', 'pretzel', 'raisin', 'recipe', 'roast',
    'salt', 'sauce', 'slice', 'spice', 'stew', 'sugar', 'syrup',
    'taco', 'tea', 'toast', 'truffle', 'vanilla', 'waffle', 'wheat',

    // Body / People
    'arm', 'bone', 'brain', 'clan', 'crew', 'face', 'fist',
    'hand', 'head', 'king', 'knight', 'lord', 'maiden', 'monk',
    'palm', 'queen', 'sage', 'scout', 'tribe', 'warrior', 'wizard',

    // Technology-adjacent words
    'app', 'base', 'bit', 'byte', 'chip', 'click', 'cloud',
    'code', 'data', 'digital', 'dot', 'drop', 'fiber', 'flash',
    'grid', 'hack', 'hub', 'kernel', 'layer', 'link', 'loop',
    'matrix', 'mesh', 'net', 'node', 'pixel', 'port', 'proxy',
    'pulse', 'scan', 'script', 'server', 'signal', 'socket', 'stack',
    'stream', 'stripe', 'switch', 'sync', 'tap', 'token', 'vector',
    'web', 'wire',

    // Places / Architecture
    'arch', 'arena', 'barn', 'base', 'cabin', 'camp', 'castle',
    'cave', 'chapel', 'citadel', 'colony', 'cottage', 'court', 'den',
    'dock', 'dome', 'fort', 'grove', 'haven', 'hive', 'home',
    'house', 'hub', 'inn', 'keep', 'lodge', 'manor', 'market',
    'mill', 'mine', 'nest', 'nook', 'outpost', 'palace', 'park',
    'pier', 'ranch', 'realm', 'reef', 'retreat', 'sanctuary', 'shed',
    'shop', 'shrine', 'stable', 'studio', 'temple', 'terrace', 'villa',
    'yard',

    // Music / Sound
    'anthem', 'bass', 'beat', 'bell', 'boom', 'cadence', 'chord',
    'chime', 'clap', 'click', 'drum', 'echo', 'encore', 'harmony',
    'hum', 'lyric', 'melody', 'note', 'pitch', 'rhythm', 'ring',
    'roar', 'rumble', 'snap', 'sonic', 'sound', 'tempo', 'tone',
    'tune', 'verse', 'whisper',

    // Time
    'dawn', 'dusk', 'epoch', 'era', 'eve', 'moment', 'noon',
    'origin', 'period', 'prime', 'season', 'second', 'spring', 'summer',
    'sunset', 'winter',

    // Misc common words that are also brand names
    'able', 'acre', 'adept', 'agile', 'ally', 'alpha', 'ample',
    'apex', 'arc', 'arid', 'axis', 'bang', 'bark', 'beam',
    'bench', 'bend', 'berry', 'blank', 'blend', 'blitz', 'brace',
    'branch', 'brass', 'brief', 'brisk', 'broad', 'canal', 'cedar',
    'chief', 'civic', 'clay', 'clip', 'clue', 'colt', 'comet',
    'compact', 'concept', 'condor', 'consul', 'copper', 'cosmos',
    'cotton', 'cove', 'delta', 'depot', 'disk', 'draft', 'drip',
    'dusk', 'dynamo', 'eagle', 'elm', 'ember', 'ether', 'exact',
    'factor', 'falcon', 'fawn', 'ferry', 'fiber', 'figure', 'finder',
    'flap', 'flat', 'fleet', 'flint', 'flux', 'focal', 'forge',
    'fossil', 'frank', 'frost', 'gale', 'gamma', 'garnet', 'gauge',
    'genie', 'giant', 'gleam', 'grain', 'harbor', 'hardy', 'haven',
    'hawk', 'helix', 'herald', 'heron', 'hollow', 'hound', 'hybrid',
    'icon', 'index', 'inlet', 'ionic', 'iris', 'isle', 'ivory',
    'jet', 'jewel', 'keen', 'kite', 'lark', 'laser', 'latch',
    'lateral', 'launch', 'layer', 'lean', 'lever', 'liner', 'loft',
    'lunar', 'lynx', 'mango', 'maple', 'marsh', 'maxi', 'mesa',
    'metro', 'mica', 'micro', 'mink', 'mint', 'mocha', 'molar',
    'motor', 'mural', 'neon', 'nova', 'nucleus', 'oasis', 'olive',
    'omega', 'onion', 'orca', 'oxide', 'oyster', 'panda', 'panther',
    'parcel', 'petal', 'pilot', 'pixel', 'plaid', 'polar', 'polaris',
    'presto', 'quasar', 'quartz', 'radar', 'radial', 'rapid', 'raven',
    'recon', 'relay', 'relay', 'render', 'ridge', 'ripple', 'robust',
    'rover', 'rustic', 'saber', 'satin', 'scope', 'scroll', 'sequel',
    'sonic', 'spade', 'splint', 'spruce', 'stark', 'summit', 'swallow',
    'tango', 'taper', 'tartan', 'tempo', 'terra', 'theorem', 'timber',
    'titan', 'topaz', 'torque', 'trident', 'trojan', 'trophy', 'turf',
    'ultra', 'umber', 'unity', 'vanguard', 'vector', 'velvet', 'vertex',
    'vibe', 'vigil', 'vital', 'volt', 'vortex', 'warp', 'zenith',
]);

/**
 * Check if a brand name is a common English dictionary word.
 * Only checks single-word brand names (multi-word brands are unlikely to collide).
 */
export function isDictionaryWord(brandName: string): boolean {
    const clean = brandName.toLowerCase().trim();
    // Multi-word brands are extremely unlikely to be dictionary phrases
    if (clean.includes(' ') && clean.split(/\s+/).length > 1) return false;
    return COMMON_ENGLISH_WORDS.has(clean);
}
