import * as vscode from "vscode";
import { Logger } from "./logger";
import { Maybe } from "./types";

/**
 * Manager class for Michelson Views instances
 */
export class ViewManager implements vscode.TextDocumentContentProvider {
  static readonly scheme = "michelson";

  private readonly _log: Logger;
  private readonly _context: vscode.ExtensionContext;
  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  private _views: Map<string, MichelsonView>;

  get onDidChange() {
    return this._onDidChange.event;
  }

  constructor(context: vscode.ExtensionContext, logger: Logger) {
    this._context = context;
    this._log = logger;
    this._views = new Map<string, MichelsonView>();
  }

  /**
   * Display text according to the returned value.
   * @param uri The document to be affected by the changes.
   * @returns The returned string serves as contents for the document.
   */
  provideTextDocumentContent(uri: vscode.Uri): string {
    // Simply return the contents of the Michelson View instance mapped by the michelson uri
    const view = this._views.get(uri.fsPath);
    return view ? view.contents : `# Contents of ${uri} are empty`;
  }

  /**
   * Display the michelson contract contents for the specified uri.
   * @param ligoUri Uri of the ligo document whose contract representation is to be instatiated.
   * @param michelsonUri Uri of the michelson contract to be displayed.
   * @param contents Contents of michelson file.
   */
  public async display(
    ligoUri: vscode.Uri,
    michelsonUri: vscode.Uri,
    contents: string
  ) {
    // Update scheme for michelson syntax coloring
    michelsonUri = michelsonUri.with({ scheme: ViewManager.scheme });
    let view = this._views.get(michelsonUri.fsPath);

    // Document attribute might be closed unexpectedly
    if (!view || view.doc!.isClosed) {
      view = await this.createView(ligoUri, michelsonUri, contents);
    } else {
      // fire method triggers provideTextDocumentContent
      this.updateContents(view, contents);
      this._onDidChange.fire(michelsonUri);
    }

    view.show();
  }

  /**
   * Attempt to fetch MichelsonView from parameter.
   * @param uri Uri of for a michelson file.
   * @returns Possibly a MichelsonView instance for specified uri.
   */
  public getView(uri: vscode.Uri): Maybe<MichelsonView> {
    return this._views.get(uri.fsPath);
  }

  /**
   * Create an instance of Michelson View for a ligo document uri.
   * @param ligoUri Uri of the ligo document whose contract representation is to be instatiated.
   * @param michelsonUri Uri of the michelson contract file.
   * @param contents Contents of michelson file.
   */
  private async createView(
    ligoUri: vscode.Uri,
    michelsonUri: vscode.Uri,
    contents: string
  ): Promise<MichelsonView> {
    // openTextDocument should only be done after newView is added to map
    const newView = new MichelsonView(ligoUri, contents);
    this._views.set(michelsonUri.fsPath, newView);

    // openTextDocument triggers provideTextDocumentContent
    const doc = await vscode.workspace.openTextDocument(michelsonUri);
    newView.doc = doc;

    return newView;
  }

  /**
   * Update contents of a michelson view object
   * @param view Michelson view
   * @param contents Michelson code as a string.
   */
  private updateContents(view: MichelsonView, contents: string) {
    view.contents = contents;
    // doc attribute in class is always present in after it is set the first time
    this._views.set(view.doc!.uri.fsPath, view);
  }
}

/**
 * Representation of a michelson document
 */
class MichelsonView {
  private _ligoUri: vscode.Uri;
  private _contents: string;
  private _doc: Maybe<vscode.TextDocument>;

  constructor(ligoUri: vscode.Uri, contents: string) {
    this._ligoUri = ligoUri;
    this._contents = contents;
  }

  public get ligoUri(): vscode.Uri {
    return this._ligoUri;
  }

  public get contents(): string {
    return this._contents;
  }
  public set contents(value: string) {
    this._contents = value;
  }

  public get doc(): Maybe<vscode.TextDocument> {
    return this._doc;
  }
  public set doc(value: Maybe<vscode.TextDocument>) {
    this._doc = value;
  }

  public show() {
    // We can assert document is assigned here
    vscode.window.showTextDocument(this.doc!, {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
      preview: true,
    });
  }
}
