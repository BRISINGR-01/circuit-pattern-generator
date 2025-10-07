export default class Debug {
	static isEnabled = true;
	static data: any[] = [];

	static reset() {
		this.data.length = 0;
	}

	static add(newData: any) {
		if (this.isEnabled) this.data.push(newData);
	}

	static addToLast(newData: any) {
		if (this.isEnabled) {
			for (const key in newData) {
				this.data.at(-1)[key] = newData[key];
			}
		}
	}

	static removeDebugPoints() {
		[...document.getElementsByClassName("debug-point"), ...document.getElementsByClassName("debug-info")].forEach(
			(el) => el.parentElement!.removeChild(el)
		);
	}
}

export function ensureVisible(element: HTMLElement) {
	const rect = element.getBoundingClientRect();
	const margin = 10; // space from edges

	let newTop = 0;
	let newLeft = 0;

	if (rect.top < margin) newTop += margin - rect.top;
	if (rect.left < margin) newLeft += margin - rect.left;
	if (rect.bottom > window.innerHeight - margin) newTop -= rect.bottom - (window.innerHeight - margin);
	if (rect.right > window.innerWidth - margin) newLeft -= rect.right - (window.innerWidth - margin);

	element.style.top = `${newTop}px`;
	element.style.left = `${newLeft}px`;
}

export function createDebugPoint(node: any) {
	const div = document.createElement("div");
	div.className = "debug-point";
	div.style.left = `${node.position.x}px`;
	div.style.top = `${node.position.y}px`;

	const info = document.createElement("pre");
	info.className = "debug-info";
	info.textContent = JSON.stringify(node, null, 2);

	let open = false;
	div.addEventListener("click", () => {
		open = !open;
		info.style.display = open ? "block" : "none";
		if (open) ensureVisible(div.children[0] as HTMLElement);
	});

	div.appendChild(info);

	document.body.appendChild(div);
}
