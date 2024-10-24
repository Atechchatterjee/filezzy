import { useKeyboardEvents } from '../lib/keyboardEvents';
import { Component, createEffect, createSignal, Index, Setter } from 'solid-js';
import { useKeyDownList } from "@solid-primitives/keyboard";
import { cn, removeTrailingSlash, safeAwait } from '../lib/utils';
import { ListDir } from '../wailsjs/go/backend/App';
import "./index.css";

async function fetchFileList(specifiedFilePath: string): Promise<any> {
	const [err, dirList] = await safeAwait(ListDir(specifiedFilePath, {
		IncludeDotfiles: false,
		Sort: true,
	}));

	if (err) return Promise.reject(err);
	return Promise.resolve(dirList);
}

const InputBar: Component<{ setInputRef: Setter<any>, moveToPrevDir?: () => void }> = ({ setInputRef, moveToPrevDir }) => {
	return (
		<div class="flex gap-6 w-full h-[3.2rem] bg-[#262A32] border border-[#434A58] items-center px-4 fixed" style={{ widows: 1 }}>
			<img src="/src/assets/back-arrow-fill.svg" alt="arrow-back-fill" class="h-6 w-6" onClick={moveToPrevDir} />
			<input id="search-input" class="h-[100%] bg-[#262A32] text-white focus:outline-none text-lg w-full cursor-default" placeholder="Search" ref={setInputRef} />
			<div class="flex gap-4 ml-auto">
				<img src="/src/assets/search-icon.svg" alt="arrow-back-fill" class="h-5 w-5" />
				<img src="/src/assets/menu-icon.svg" alt="arrow-back-fill" class="h-5 w-5" />
			</div>
		</div>
	);
}


export const App: Component = () => {
	const [fileList, setFileList] = createSignal<any[]>([]);
	const [selectedFile, setSelectedFile] = createSignal<number>(0);
	const [currentDir, setCurrentDir] = createSignal<string>("/");

	const [inputRef, setInputRef] = createSignal<HTMLInputElement>();

	const fileItemsRef: any[] = [];

	createEffect(() => {
		const focusedElement = fileItemsRef[selectedFile()];
		if (focusedElement) {
			focusedElement.scrollIntoView({
				behavior: "instant",
				block: "center",
				inline: "center",
			});
		}
	});

	const keyCombo = useKeyDownList();

	createEffect(() => {
		if (keyCombo()[0] === "CONTROL" && keyCombo()[1] === "F") {
			inputRef()?.focus();
		}
		if (keyCombo()[0] === "ESCAPE") {
			inputRef()?.blur();
		}
	})

	const updateCurDirToNext = () => {
		const currentlySelectedFile = fileList()[selectedFile()];
		setCurrentDir(currentDir() + "/" + currentlySelectedFile.FileName);
	}

	const updateCurDirToPrev = () => {
		const trimmedCurrentDir = removeTrailingSlash(currentDir());
		if (trimmedCurrentDir !== "") {
			setCurrentDir(trimmedCurrentDir.substring(0, trimmedCurrentDir.lastIndexOf('/')));
		}
	}

	const searchInputActive = () => document.activeElement === inputRef();

	useKeyboardEvents((key) => {
		if (searchInputActive()) return;

		// Navigate only if input-box is not active (in-focus)
		if (key === "j") {
			if (selectedFile() < fileList().length - 1) {
				setSelectedFile(selectedFile() + 1);
			}
		} if (key === "k") {
			if (selectedFile() > 0) {
				setSelectedFile(selectedFile() - 1);
			}
		}
		if ((key === "Enter" || key === "l")) {
			updateCurDirToNext();
		}
		if (key === "h") {
			updateCurDirToPrev();
		}
	});

	createEffect(async () => {
		const [err, files] = await safeAwait(fetchFileList(currentDir()));
		if (!err) {
			console.log(files);
			setFileList(files);
			setSelectedFile(0);
		} else {
			updateCurDirToPrev();
		}
	});

	return (
		<div class="flex flex-col rounded-xl">
			<InputBar setInputRef={setInputRef} moveToPrevDir={updateCurDirToPrev} />
			<div class="text-white space-y-2 px-4 py-4 mt-14 h-[100vh]">
				<Index each={fileList()} fallback={"Empty"}>
					{(file, i) => (
						<div
							class={cn("flex gap-4 py-3 px-4 hover:bg-[#303540] rounded-md items-center cursor-pointer select-none", selectedFile() === i ? "bg-[#303540]" : "")}
							ref={el => fileItemsRef[i] = el}
							onClick={() => {
								setSelectedFile(i);
								updateCurDirToNext();
							}}
						>
							<img src={file().IsDir ? "/src/assets/folder-icon.svg" : "/src/assets/file-icon.svg"} alt="folder-icon" class="h-5 w-5" />
							<div class="">{file().FileName}</div>
							{!file().Perm ?
								<img src={"/src/assets/lock-icon.svg"} alt="lock-icon" class="h-5 w-5 ml-auto" />
								: ""}
						</div>
					)}
				</Index>
			</div>
		</div>
	)
};

export default App;
