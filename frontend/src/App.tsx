import { Component, createEffect, createSignal, Index, onMount } from 'solid-js';
import { useKeyDownEvent } from "@solid-primitives/keyboard";
import { cn } from '../lib/utils';
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

const InputBar: Component = () => {
	return (
		<div class="flex gap-6 w-full h-[3.2rem] bg-[#262A32] border border-[#434A58] items-center px-4 fixed" style={{ widows: 1 }}>
			<img src="/src/assets/back-arrow-fill.svg" alt="arrow-back-fill" class="h-6 w-6" />
			<input class="h-[100%] bg-[#262A32] text-white focus:outline-none text-lg w-full" placeholder="Search" />
			<div class="flex gap-4 ml-auto">
				<img src="/src/assets/search-icon.svg" alt="arrow-back-fill" class="h-5 w-5" />
				<img src="/src/assets/menu-icon.svg" alt="arrow-back-fill" class="h-5 w-5" />
			</div>
		</div>
	);
}

const FileView: Component = () => {
	const [fileList, setFileList] = createSignal<any[]>([]);
	const [selectedFile, setSelectedFile] = createSignal<number>(0);
	const [trigger, setTrigger] = createSignal<-1 | 0 | 1>(0);

	const itemsRef: any[] = [];

	createEffect(() => {
		const focusedElement = itemsRef[selectedFile()];
		if (focusedElement) {
			focusedElement.scrollIntoView({
				behavior: "instant",
				block: "center",
				inline: "center",
			});
		}
	});

	console.log("re-rendering file-view");

	const event = useKeyDownEvent();

	createEffect(() => {
		const e = event();

		if (e) {
			if (e.key === "j") {
				setTrigger(1);
			}
			if (e.key === "k") {
				setTrigger(-1);
			}
		}
	});

	createEffect(() => {
		if (trigger() === 1 && selectedFile() < fileList().length - 1) {
			//console.log("incrementing");
			setSelectedFile(selectedFile() + 1);
		}
		if (trigger() === -1 && selectedFile() > 0) {
			//console.log("decrementing");
			setSelectedFile(selectedFile() - 1);
		}
		setTrigger(0);
	})

	onMount(async () => {
		const files = await fetchFileList("/home/anish")
		console.log(files);
		setFileList(files);
	});

	return <div class="text-white space-y-2 px-4 py-4 mt-14" on:keydown={(key) => {
		console.log(key);
		alert("hi");
	}}>
		<Index each={fileList()} fallback={"loading"}>
			{(file, i) => (
				<div
					class={cn("flex gap-4 py-3 px-4 hover:bg-[#303540] rounded-md items-center cursor-pointer", selectedFile() === i ? "bg-[#303540]" : "")}
					ref={el => itemsRef[i] = el}
				>
					<img src={file().IsDir ? "/src/assets/folder-icon.svg" : "/src/assets/file-icon.svg"} alt="folder-icon" class="h-5 w-5" />
					<div class="">{file().FileName}</div>
				</div>
			)}
		</Index>
	</div>
}

const App: Component = () => {
	return (
		<div class="flex flex-col rounded-xl">
			<InputBar />
			<FileView />
		</div>
	);
};

export default App;
