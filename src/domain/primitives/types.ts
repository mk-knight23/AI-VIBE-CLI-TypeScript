export interface PrimitiveResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface IPrimitive {
    id: string;
    name: string;
    execute(input: any): Promise<PrimitiveResult>;
}

export abstract class BasePrimitive implements IPrimitive {
    abstract id: string;
    abstract name: string;
    abstract execute(input: any): Promise<PrimitiveResult>;
}
