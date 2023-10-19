import ts from 'typescript';

function typecheck(code: string) {
	console.log(`Type checking the following code:\n${code}\n`);
	const file = ts.createSourceFile('index.ts', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

	// This is needed
	const compilerHost: ts.CompilerHost = {
		fileExists: (fileName) => fileName === file.fileName,
		getSourceFile: (fileName) => (fileName === file.fileName ? file : undefined),
		getDefaultLibFileName: () => '',
		writeFile: () => {},
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (f) => f.toLowerCase(),
		getNewLine: () => '\n',
		useCaseSensitiveFileNames: () => false,
		readFile: (fileName) => (fileName === file.fileName ? file.text : undefined),
	};

	const program = ts.createProgram(
		[file.fileName],
		{
			allowJs: true,
			noEmitOnError: true,
			noImplicitAny: true,
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.ESNext,
		},
		compilerHost,
	);


	const emitResult = program.emit();
	const allDiagnostics = ts.getPreEmitDiagnostics(program);

	console.log( { emitResult, allDiagnostics })

	allDiagnostics.forEach((diagnostic) => {
		if (diagnostic.file) {
			const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
			const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
		} else {
			console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
		}
	});

	const exitCode = emitResult.emitSkipped ? 1 : 0;
	console.log(`Process exiting with code '${exitCode}'.`);
	process.exit(exitCode);
}

try {
	const CODE = 'const a: string = 1;';
	console.log(typecheck(CODE));
	// eslint-disable-next-line
} catch (err: any) {
	console.log(err.message);
}
