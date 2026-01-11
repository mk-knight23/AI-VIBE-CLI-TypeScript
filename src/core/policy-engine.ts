export interface VibePolicy {
    id: string;
    name: string;
    rule: (context: any) => boolean;
    message: string;
}

export class PolicyEngine {
    private static policies: VibePolicy[] = [
        {
            id: 'no-root',
            name: 'No Root Execution',
            rule: (ctx) => !ctx.command?.includes('sudo'),
            message: 'Running commands as root is forbidden by org policy.',
        },
        {
            id: 'max-cost',
            name: 'Budget Cap',
            rule: (ctx) => ctx.sessionCost < 10.0,
            message: 'Individual session cost limit reached ($10).',
        },
    ];

    static validate(context: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        for (const policy of this.policies) {
            if (!policy.rule(context)) {
                errors.push(policy.message);
            }
        }
        return { valid: errors.length === 0, errors };
    }
}
