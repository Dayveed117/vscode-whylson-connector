export interface CompileContractOptions {
  entrypoint: string
  onPath?: string
  flags: string[]
};

export interface ContractEntryScheme extends CompileContractOptions {
  source: string
  onPath: string
};

export type Maybe<T> = T | undefined;
