export type RuleDecision = 'allow' | 'block';

export interface ExtractedTxData {
	fromAddress?: string;
	toAddress?: string;
	nonce?: number;
	gasPrice?: string;
	gasLimit?: string;
}

export interface RuleContext {
	jsonrpc: string | undefined;
	method: string;
	params: unknown[] | undefined;
	id: unknown;
	clientIp: string;
	reqId: string; // correlation id
	extracted: ExtractedTxData;
}

export interface RuleResult {
	decision: RuleDecision;
	reason: string;
	rule?: string;
	tags?: string[];
}

export interface StaticRulesConfig {
	allowedMethods?: string[];
	blockedMethods?: string[];
	blockedAddresses?: string[]; // apply to from/to
	maxGasPriceWei?: string; // as decimal string
	minGasPriceWei?: string;
	maxGasLimit?: number;
}

export interface HeuristicRateLimitConfig {
	windowSeconds: number;
	perIpTps?: number;
	perAddressTps?: number;
	perMethodPerIpTps?: number;
}

export interface HeuristicRulesConfig {
	rateLimit?: HeuristicRateLimitConfig;
	fingerprintWindowSeconds?: number;
	fingerprintMaxRepeats?: number; // max identical payload repeats per window per ip
	nonceAnomalyWindowSeconds?: number;
	maxDuplicateNoncesPerWindow?: number;
	// Sybil defense: cap unique addresses per IP within a sliding window
	sybilUniqueAddressesWindowSeconds?: number;
	sybilMaxUniqueAddressesPerWindow?: number;
}

export interface ReputationConfig {
	minScoreToAllow?: number; // if below -> block
	penaltyBlocked?: number; // score change when blocked
	rewardAllowed?: number; // score change when allowed
	initialScore?: number;
}

export interface RuleConfig {
	static: StaticRulesConfig;
	heuristics: HeuristicRulesConfig;
	reputation?: ReputationConfig;
}