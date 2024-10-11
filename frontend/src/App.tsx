import { Component, createEffect, createSignal, Index, onMount, Setter } from 'solid-js';
import { useKeyDownEvent, useKeyDownList } from "@solid-primitives/keyboard";
import { cn, removeTrailingSlash, safeAwait } from '../lib/utils';
import { ListDir } from '../wailsjs/go/backend/App';
import "./index.css";

async function fetchFileList(specifiedFilePath: string): Promise<any> {
	return new Promise(async (resolve, reject) => {
		ListDir(specifiedFilePath, {
			IncludeDotfiles: false,
			Sort: true,
		})
			.then((res) => {
				resolve(res);
			})
			.catch((err) => reject(err));
	});
}

const InputBar: Component<{ setInputRef: Setter<any> }> = ({ setInputRef }) => {
	return (
		<div class="flex gap-6 w-full h-[3.2rem] bg-[#262A32] border border-[#434A58] items-center px-4 fixed" style={{ widows: 1 }}>
			<img src="/src/assets/back-arrow-fill.svg" alt="arrow-back-fill" class="h-6 w-6" />
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
	const [updateFileSelection, setUpdateFileSelection] = createSignal<-1 | 0 | 1>(0);

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

	const keyDownEvent = useKeyDownEvent();

	const keyCombo = useKeyDownList();

	createEffect(() => {
		if (keyCombo()[0] === "CONTROL" && keyCombo()[1] === "F") {
			inputRef()?.focus();
		}
		if (keyCombo()[0] === "ESCAPE") {
			inputRef()?.blur();
		}
	})

	const [dirUpdateTrigger, setDirUpdatedTrigger] = createSignal(false);

	createEffect(async () => {
		if (dirUpdateTrigger()) {
			const [err, files] = await safeAwait(fetchFileList(currentDir()));
			if (!err) {
				setFileList(files);
				setDirUpdatedTrigger(false);
				setSelectedFile(0);
			}
		}
	})

	const moveToNextDir = () => {
		const currentlySelectedFile = fileList()[selectedFile()];
		setCurrentDir(currentDir() + "/" + currentlySelectedFile.FileName);

		setDirUpdatedTrigger(true);
	}

	const moveToPrevDir = () => {
		const trimmedCurrentDir = removeTrailingSlash(currentDir());

		if (trimmedCurrentDir !== "") {
			setCurrentDir(trimmedCurrentDir.substring(0, trimmedCurrentDir.lastIndexOf('/')));
			setDirUpdatedTrigger(true);
		}
	}

	createEffect(() => {
		const e = keyDownEvent();
		const searchInputActive = document.activeElement === inputRef();

		if (e && !searchInputActive) {
			if (e.key === "j") setUpdateFileSelection(1);
			if (e.key === "k") setUpdateFileSelection(-1);
			if ((e.key === "Enter" || e.key === "l") && !dirUpdateTrigger()) moveToNextDir();
			if (e.key === "h" && !dirUpdateTrigger()) moveToPrevDir();
		}
	});

	createEffect(() => {
		if (updateFileSelection() === 1 && selectedFile() < fileList().length - 1) {
			setSelectedFile(selectedFile() + 1);
		}
		if (updateFileSelection() === -1 && selectedFile() > 0) {
			setSelectedFile(selectedFile() - 1);
		}
		setUpdateFileSelection(0);
	})

	onMount(async () => {
		const [err, files] = await safeAwait(fetchFileList(currentDir()));
		if (!err) {
			console.log(files);
			setFileList(files);
		} else {
			setFileList([]);
			alert("You don't have permissions to view this folder");
		}
	});

	return (
		<div class="flex flex-col rounded-xl">
			<InputBar setInputRef={setInputRef} />
			<div class="text-white space-y-2 px-4 py-4 mt-14" on:keydown={(key) => {
				console.log(key);
				alert("hi");
			}}>
				<Index each={fileList()} fallback={"loading"}>
					{(file, i) => (
						<div
							class={cn("flex gap-4 py-3 px-4 hover:bg-[#303540] rounded-md items-center cursor-pointer select-none", selectedFile() === i ? "bg-[#303540]" : "")}
							ref={el => fileItemsRef[i] = el}
						>
							<img src={file().IsDir ? "/src/assets/folder-icon.svg" : "/src/assets/file-icon.svg"} alt="folder-icon" class="h-5 w-5" />
							<div class="">{file().FileName}</div>
						</div>
					)}
				</Index>
			</div>
		</div>
	)
};

export default App;
