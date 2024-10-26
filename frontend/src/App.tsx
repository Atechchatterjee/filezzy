import { useKeyboardEvents } from '../lib/keyboardEvents';
import { Component, createEffect, createSignal, Index, onCleanup, Setter } from 'solid-js';
import { useKeyDownList } from "@solid-primitives/keyboard";
import { cn, removeTrailingSlash, safeAwait, truncateFilePath } from '../lib/utils';
import { CopyFile, DeleteFile, ListDir, OpenWithDefaultApplication, SearchFiles } from '../wailsjs/go/backend/App';
import "./index.css";
import Empty from './components/Empty';

async function fetchFileList(specifiedFilePath: string): Promise<any> {
	const [err, dirList] = await safeAwait(ListDir(specifiedFilePath, {
		IncludeDotfiles: false,
		Sort: true,
	}));

	if (err) return Promise.reject(err);
	return Promise.resolve(dirList);
}

const InputBar: Component<{ setInputRef: Setter<any>, moveToPrevDir?: () => void }> = ({ setInputRef, moveToPrevDir }) => {
	const [focus, setFocus] = createSignal(false);

	return (
		<div class={cn("flex gap-6 w-full h-[3.2rem] ", focus() ? "bg-[#2E323A]" : "bg-[#262A32]", "rounded-t-lg border", focus() ? "border-[#949CAA]" : "border-[#434A58]", " items-center px-4 fixed")} style={{ widows: 1 }}>
			<img src="/src/assets/back-arrow-fill.svg" alt="arrow-back-fill" class="h-6 w-6 cursor-pointer hover:opacity-80" onClick={moveToPrevDir} />
			<input id="search-input" class={cn("h-[100%] ", focus() ? "bg-[#2E323A]" : "bg-[#262A32]", "text-white focus:outline-none text-lg w-full cursor-default")} placeholder="Search" ref={setInputRef} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
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

	const [copySource, setCopySource] = createSignal<string>();
	const [copyDest, setCopyDest] = createSignal<string>();

	const [disableScrolling, setDisableScrolling] = createSignal<boolean>(false);

	const [inputRef, setInputRef] = createSignal<HTMLInputElement>();

	const fileItemsRef: any[] = [];

	// disables auto scrolling when moving focus of selected files
	const bodyOnClick = () => {
		setDisableScrolling(true);
	}

	document.body.addEventListener("click", bodyOnClick);
	onCleanup(() => document.body.removeEventListener("click", bodyOnClick));

	createEffect(() => {
		// should not scroll if user is selecting files using clicks
		if (!disableScrolling()) {
			const focusedElement = fileItemsRef[selectedFile()];
			if (focusedElement) {
				focusedElement.scrollIntoView({
					behavior: "instant",
					block: "center",
					inline: "center",
				});
			}
		}
	});

	const fetchList = async () => {
		console.log("fetching new file");
		const [err, files] = await safeAwait(fetchFileList(currentDir()));
		if (!err) {
			console.log(files);
			setFileList(files);
			setSelectedFile(0);
		} else {
			updateCurDirToPrev();
		}
	}

	const keyCombo = useKeyDownList();

	// used for detecting consecutive presses
	let GPress = false, DPress = false;

	let fileToCopyName = ""; // to keep track of copied file name

	createEffect(async () => {
		if (keyCombo()[0] === "CONTROL" && keyCombo()[1] === "F") {
			inputRef()?.focus();
		}

		if (keyCombo()[0] === "SHIFT" && keyCombo()[1] === "G") {
			const len = fileList().length;
			setSelectedFile(len - 1);
			GPress = false;
		}

		if (keyCombo()[0] === "ESCAPE") {
			inputRef()?.blur();
		}

		if (keyCombo()[0] === "CONTROL" && keyCombo()[1] === "C") {
			const currentlySelectedFile = fileList()[selectedFile()];
			fileToCopyName = currentlySelectedFile.FileName;
			setCopySource(currentDir() + "/" + currentlySelectedFile.FileName);
		}
		if (keyCombo()[0] === "CONTROL" && keyCombo()[1] === "V") {
			setCopyDest(currentDir() + "/" + fileToCopyName);
			const cs = copySource(), ds = copyDest();
			if (cs && ds) {
				alert(cs + " -> " + ds);
				await safeAwait(CopyFile(cs, ds));
				fetchList();
			}
		}
	})

	const updateCurDirToNext = () => {
		const currentlySelectedFile = fileList()[selectedFile()];
		setCurrentDir(removeTrailingSlash(currentDir()) + "/" + currentlySelectedFile.FileName);
	}

	const updateCurDirToPrev = () => {
		const trimmedCurrentDir = removeTrailingSlash(currentDir());
		if (trimmedCurrentDir !== "") {
			setCurrentDir(trimmedCurrentDir.substring(0, trimmedCurrentDir.lastIndexOf('/') + 1));
		}
	}

	const searchInputActive = () => document.activeElement === inputRef();

	const enterFileAction = async () => {
		const currentlySelectedFile = fileList()[selectedFile()];

		if (!currentlySelectedFile.Perm) return;

		if (currentlySelectedFile.IsDir) {
			updateCurDirToNext();
		} else {
			console.log("opening with default ... ", currentlySelectedFile.IsDir);
			if (!currentlySelectedFile.IsDir) {
				console.log("opening = ", currentDir() + "/" + currentlySelectedFile.FileName)
				await safeAwait(OpenWithDefaultApplication(currentDir() + "/" + currentlySelectedFile.FileName, currentlySelectedFile));
			}
		}
	}

	useKeyboardEvents(async (event) => {
		const key: string = event.key;
		// keybinds when input box is in focus
		if (searchInputActive()) {
			if (key === "Enter") {
				const iRef = inputRef();
				if (iRef !== undefined) {
					if (iRef.value === "") {
						fetchList();
						iRef.blur()
						setSelectedFile(0);
					} else {
						const matchedFileList = await SearchFiles(currentDir(), iRef.value)
						setFileList(matchedFileList);
						iRef.value = "";
						iRef.blur()
						setSelectedFile(0);
					}
				}
			}
			return;
		}

		if (key == "g") {
			if (!GPress) GPress = true;
			else {
				setSelectedFile(0);
				GPress = false;
			}
		}

		if (key == "d") {
			if (!DPress) DPress = true;
			else {
				const currentlySelectedFile = fileList()[selectedFile()];
				await safeAwait(DeleteFile(currentDir() + "/" + currentlySelectedFile.FileName));
				DPress = false;
				fetchList();
				setSelectedFile(currentlySelectedFile - 1 >= 0 ? currentlySelectedFile - 1 : 0);
			}
		}


		// Keybinds when inputbox is not in fox
		if (key === "/") {
			event.preventDefault();
			inputRef()?.focus();
		}
		if (key === "j") {
			if (disableScrolling()) setDisableScrolling(false);

			if (selectedFile() < fileList().length - 1) {
				setSelectedFile(selectedFile() + 1);
			}
		} if (key === "k") {
			if (disableScrolling()) setDisableScrolling(false);

			if (selectedFile() > 0) {
				setSelectedFile(selectedFile() - 1);
			}
		}
		if ((key === "Enter" || key === "l")) {
			enterFileAction();
		}
		if (key === "h") {
			updateCurDirToPrev();
		}
	});

	createEffect(fetchList);

	return (
		<>
			<div class="flex flex-col rounded-xl">
				<InputBar setInputRef={setInputRef} moveToPrevDir={updateCurDirToPrev} />
				<div class="w-full h-[3.2rem]"></div>
				<div class="text-white space-y-2 px-4 py-4 h-[100vh]">
					<Index each={fileList()} fallback={<Empty />}>
						{(file, i) => (
							<div
								class={cn("flex gap-4 py-3 px-4 hover:bg-[#303540] rounded-md items-center cursor-pointer select-none overflow-clip", selectedFile() === i ? "bg-[#303540]" : "")}
								ref={el => fileItemsRef[i] = el}
								onClick={() => {
									setTimeout(() => {
										setSelectedFile(i);
									}, 100);
								}}
								onDblClick={() => {
									setSelectedFile(i);
									enterFileAction();
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
			<div class="fixed bottom-[1rem] right-[1rem] py-1 px-4 bg-[#252933] text-white rounded-full">
				{currentDir() === "/" ? "/" : truncateFilePath(currentDir())}
			</div>
		</>
	)
};

export default App;
