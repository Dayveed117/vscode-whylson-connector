/**
 * Generic type option `T`. Either there is `T` or `undefined`.
 */
export type Maybe<T> = T | undefined;

/**
 * Simple compile contract options.
 */
export interface CompileContractOptions {
  /**
   * Entrypoint for a michelson contract.
   */
  entrypoint: string
  /**
   * Output path for michelson contract.
   */
  onPath: Maybe<string>
  /**
   * List of flags to be added on compilation.  
   * **Flags must be properly ordered with their arguments.**
   */
  flags: string[]
};

/**
 * 
 */
export interface CompileContractOutput {
  /**
   * Given command for compilation,
   */
  command: string
  /**
   * If output was not redirected to file, outputs contents to stdout.  
   * If output was redirected, contents are empty string.
   */
  stdout: Maybe<string>
  /**
   * Compile operation result.
   */
  status: boolean
}

/**
 * Type of entries present in contracts.json.
 */
export interface ContractEntryScheme extends CompileContractOptions {
  /**
   * Basename in `source` field, for convenience.
   */
  title: string
  /**
   * File path to ligo document.
   */
  source: string
  /**
   * Overwritting `CompileContractOptions'
   * to always have an output path.
   */
  onPath: string
};

/**
 * Type of configurations under whylson-connector.onSaveActions.
 */
export type OnSaveActions = {
  /**
   * Controls wheather or not to attempt the creation of an entry into contracts.json.
   */
  createEntry: boolean,

  /**
   * Controls wheather or not to open michelson view if closed.
   */
  openView: boolean
};
