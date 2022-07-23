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
 * The object resulting out of ligo document compilation.
 */
export interface CompileContractOutput {
  /**
   * Given command for compilation,
   */
  command?: string;
  /**
   * If output was not redirected to file, outputs contents to stdout.
   * If output was redirected, contents are empty string.
   */
  stdout: Maybe<string>;
  /**
   * Compile operation result.
   */
  status: boolean;
}

/**
 * Object type returned after compile ligo command from ligo-vscode extension.
 */
export type ExecutionResult =
  | { t: "Success"; result: string }
  | { t: "NoLigoPath" }
  | { t: "UnknownCommandType" }
  | { t: "LigoExecutionException"; error: string };

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
