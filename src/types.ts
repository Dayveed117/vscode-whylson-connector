/**
 * Generic type option `T`. Either there is `T` or `undefined`.
 */
export type Maybe<T> = T | undefined;

/**
 * Options for compiling a ligo document.
 */
export interface CompileContractOptions {
  /**
   * Entrypoint for a michelson contract.
   */
  entrypoint: string;
  /**
   * Output path for michelson contract.
   */
  onPath: Maybe<string>;
  /**
   * List of flags to be added on compilation.
   * **Flags must be properly ordered with their arguments.**
   */
  flags: string[];
}

/**
 * Type of entries present in `contracts.json`.
 */
export interface ContractEntryScheme extends CompileContractOptions {
  /**
   * Basename in `source` field, for convenience.
   */
  title: string;
  /**
   * File path to ligo document.
   */
  source: string;
  /**
   * Overwritting `CompileContractOptions'
   * to always have an output path.
   */
  onPath: string;
}

/**
 * Holds information regarding a call to ligo compile contract.
 */
export type CompilationResult = {
  /**
   * A successful Ligo compiltion is portrayed as true.
   */
  ok: boolean;

  /**
   * If it is possible to display contents from compilation.
   */
  disp: boolean;

  /**
   * Output from either standard output/error resulted from compilation.
   */
  content: string;
};
