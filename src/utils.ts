import { execSync } from 'child_process';
import * as vscode from 'vscode';


export namespace ligo {

  interface CompileContractOptions {
    inPath: string
    entrypoint: string
    outPath: string
    flags?: Map<string, string>
  }

  /**
   * Compiles the active ligo document using a set of options
   * @param cco `CompileContractOptions` : Set of options added for ligo compilation
   * @returns `true` if compilation is successful, `false` otherwise
   */
  // ! This function might be overhauled by an API call to ligo extension
  // * Function shoudl eventually accept configurations paramters
  export function compileActiveLigo(cco: CompileContractOptions) {

    try {
      let flags: string = "";
      cco.flags?.forEach((v, k) => {
        flags += `${k} ${v} `;
      });

      let command = `ligo compile contract ${cco.inPath} -e ${cco.entrypoint} -o ${cco.outPath} ${flags}`.trimEnd();
      console.log("Contract compiled");

      execSync(command, { encoding: "utf-8" });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifies if ligo executable is found within the sytem
   * @returns `true` if ligo executable is found, `false` otherwise
   */
  export async function verifyLigoBinaries() {

    try {
      execSync("which ligo", { encoding: "utf-8" });
      return true;
    } catch (error) {
      return false;
    }
  }
}
