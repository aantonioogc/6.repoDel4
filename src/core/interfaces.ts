import { Logger } from 'winston';
import { RuleConfig, RuleResult } from '../rules/types';

export interface JsonRpcForwarder {
	send(payload: unknown): Promise<unknown>;
}

export interface BaseProvider {
	handleJsonRpc(payload: unknown, clientIp: string): Promise<unknown>;
}

export interface FirewallProvider extends BaseProvider {}

export interface ProviderFactoryDeps {
	ruleConfig: RuleConfig;
	logger: Logger;
}

export interface PolicyEngine {
	evaluate(ctx: {
		method: string;
		params: unknown[] | undefined;
		clientIp: string;
		extracted: { from?: string; to?: string; nonce?: number; gasPriceWei?: bigint; gasLimit?: bigint; payloadHash?: string };
	}): Promise<RuleResult>;
}