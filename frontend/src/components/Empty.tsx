export default function Empty() {
	return <div class="flex w-full h-full fixed overflow-hidden">
		<div class="flex flex-col gap-4 justify-center mx-auto items-center mt-[-5rem] text-[#656B77]">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M22 8V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V7H21C21.5523 7 22 7.44772 22 8ZM12.4142 5H2V4C2 3.44772 2.44772 3 3 3H10.4142L12.4142 5Z" fill="#656B77" />
			</svg>
			<h1 class="text-xl">Empty Directory</h1>
		</div>
	</div>
}
