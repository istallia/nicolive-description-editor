/*
 * ニコ生説明文エディタ メインスクリプト
 */



/* --- 各種定数 --- */
const allowedTags     = ['b', 'i', 'u', 's', 'br', 'font'];
const indentedTags    = ['p', 'div'];
const maxHistoryCount = 12;



/* --- niconico-darkmode 切り替え --- */
const switchDarkTheme = event => {
	const editableArea = document.getElementById('description-wysiwyg');
	if (event.currentTarget.checked) {
		editableArea.classList.add('dark-theme');
	} else {
		editableArea.classList.remove('dark-theme');
	}
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('switch-dark-theme').addEventListener('change', switchDarkTheme);
});



/* --- 各種タグを挿入する --- */
const insertTagToSelectedRange = (tagName, attributes = {}) => {
	const selection    = window.getSelection();
	let nearestElement = selection.focusNode;
	while (nearestElement.nodeName === '#text') nearestElement = nearestElement.parentNode;
	if (selection.rangeCount < 1 || selection.isCollapsed || !nearestElement.closest('#description-wysiwyg')) return;
	const range = selection.getRangeAt(0);
	if (tagName.length > 0) {
		/* タグを挿入する場合 */
		const node     = document.createElement(tagName);
		node.innerHTML = selection.toString();
		Object.keys(attributes).forEach(key => {
			node.setAttribute(key, attributes[key]);
		});
		range.deleteContents();
		range.insertNode(node);
		range.selectNodeContents(node);
		if (Object.keys(attributes).includes('color')) recordColorHistory(attributes['color']);
	} else {
		/* 装飾を消す場合 */
		const content  = range.cloneContents().firstChild;
		let diffNode   = selection.focusNode.nextSibling || selection.focusNode;
		const diffName = (diffNode.tagName || diffNode.parentNode.tagName).toLowerCase();
		let diffParent = diffNode.parentNode;
		if (range.toString() === diffNode.textContent || allowedTags.includes(diffName)) {
			while (diffNode.nodeName === '#text' || (allowedTags.includes(diffNode.parentNode.tagName.toLowerCase()) && diffNode.textContent === diffNode.parentNode.textContent)) {
				diffNode = diffNode.parentNode;
			}
			range.selectNode(diffNode);
			diffParent = diffNode.parentNode;
		}
		if (diffParent.id === 'description-wysiwyg') {
			const node     = document.createElement('div');
			node.innerText = range.toString();
			range.deleteContents();
			range.insertNode(node);
		} else {
			const node = document.createTextNode(range.toString());
			range.deleteContents();
			range.insertNode(node);
		}
		diffParent.normalize();
	}
	document.getElementById('export-html').classList.add('btn-primary');
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('set-bold'         ).addEventListener('click', () => insertTagToSelectedRange('b'));
	document.getElementById('set-italic'       ).addEventListener('click', () => insertTagToSelectedRange('i'));
	document.getElementById('set-underline'    ).addEventListener('click', () => insertTagToSelectedRange('u'));
	document.getElementById('set-strikethrough').addEventListener('click', () => insertTagToSelectedRange('s'));
	document.getElementById('reset-style'      ).addEventListener('click', () => insertTagToSelectedRange(''));
	const colorForm = document.getElementById('font-color');
	const sizeForm  = document.getElementById('font-size');
	document.getElementById('set-font-color').addEventListener('click', () => insertTagToSelectedRange('font', {color:colorForm.value}));
	document.getElementById('set-font-size' ).addEventListener('click', () => insertTagToSelectedRange('font', {size:sizeForm.value}));
	document.getElementById('set-font-style').addEventListener('click', () => insertTagToSelectedRange('font', {color:colorForm.value, size:sizeForm.value}));
});



/* --- HTMLをエクスポート --- */
const exportHTML = (event, force = false) => {
	/* テキストエリアが変更済みなら確認する */
	if (!force && document.getElementById('import-html').classList.contains('btn-primary')) {
		document.getElementById('modal-confirm-export').classList.add('active');
		return;
	}
	document.getElementById('export-html').classList.remove('btn-primary');
	document.getElementById('import-html').classList.remove('btn-primary');
	/* 同じタグの入れ子を削除 */
	const editableArea = document.getElementById('description-wysiwyg');
	removeDuplicatedTags(editableArea);
	/* 許可されないタグと属性を削除 */
	const editableChildren = [... editableArea.children].map(child => [... child.childNodes]).flat();
	editableChildren.forEach(child => removeForbiddenTags(child));
	/* テキストを取得 */
	let htmlText     = editableArea.innerHTML.replace(/<br>/g, '<br />');
	let lastHtmlText = htmlText;
	do {
		lastHtmlText = htmlText; // divとpを改行に変換
		htmlText     = htmlText.replace(/<(?:div|p)>(.*?)<\/(?:div|p)>/gs, '$1<br />\n');
	} while (htmlText !== lastHtmlText);
	do {
		lastHtmlText = htmlText; // 末尾の改行を削除
		htmlText     = htmlText.trim().replace(/<br(?: \/)?>$/g, '');
	} while (htmlText !== lastHtmlText);
	/* テキストエリアを更新 */
	const textarea = document.getElementById('description-html');
	textarea.value = htmlText;
	updateCharCount();
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('export-html').addEventListener('click', exportHTML);
	document.getElementById('continue-export-html').addEventListener('click', event => {
		closeModal(event);
		exportHTML(event, true);
	});
	document.getElementById('description-wysiwyg').addEventListener('keydown', event => {
		if (event.key.toLowerCase() === 's' && event.ctrlKey) {
			event.preventDefault();
			exportHTML();
		}
	});
});



/* --- HTMLをインポート --- */
const importHTML = (event, force = false) => {
	/* HTMLエディタが変更済みなら確認する */
	if (!force && document.getElementById('export-html').classList.contains('btn-primary')) {
		document.getElementById('modal-confirm-import').classList.add('active');
		return;
	}
	document.getElementById('export-html').classList.remove('btn-primary');
	document.getElementById('import-html').classList.remove('btn-primary');
	/* テキストをパース */
	const htmlText = document.getElementById('description-html').value;
	const parser   = new DOMParser();
	const htmlNode = parser.parseFromString(htmlText, 'text/html');
	/* 同じタグの入れ子を削除 */
	removeDuplicatedTags(htmlNode.body);
	/* 許可されないタグと属性を削除 */
	const newChildren = [... htmlNode.body.children].map(child => [... child.childNodes]).flat();
	newChildren.forEach(child => removeForbiddenTags(child));
	/* エディタを更新 */
	const editableArea = document.getElementById('description-wysiwyg');
	const div          = document.createElement('div');
	[... editableArea.childNodes].forEach(child => child.remove());
	[... htmlNode.body.childNodes].forEach(child => div.appendChild(child));
	editableArea.appendChild(div);
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('import-html').addEventListener('click', importHTML);
	document.getElementById('continue-import-html').addEventListener('click', event => {
		closeModal(event);
		importHTML(event, true);
	});
	document.getElementById('description-html').addEventListener('keydown', event => {
		if (event.key.toLowerCase() === 's' && event.ctrlKey) {
			event.preventDefault();
			importHTML();
		}
	});
});



/* --- 許可されないタグと属性を削除 --- */
const removeForbiddenTags = element => {
	/* テキストならそのままにする */
	if (element.nodeName === '#text') return;
	/* 先に子孫を処理(再帰) */
	const baseChildren = [... element.children];
	baseChildren.forEach(child => removeForbiddenTags(child));
	/* 本体を処理 */
	element.normalize();
	const tagName = element.tagName.toLowerCase();
	if (!allowedTags.includes(tagName) || (tagName !== 'br' && element.childNodes.length < 1)) {
		[... element.childNodes].forEach(child => {
			element.parentNode.insertBefore(child, element);
		});
		if (indentedTags.includes(tagName)) {
			element.parentNode.insertBefore(document.createElement('br'), element);
			element.parentNode.insertBefore(document.createTextNode('\n'), element);
		}
		element.remove();
	} else {
		[... element.attributes].forEach(attr => {
			if (tagName !== 'font' || !['color', 'size'].includes(attr.name)) {
				element.attributes.removeNamedItem(attr.name);
			}
		});
	}
};



/* --- 入れ子になった同一タグを削除 --- */
const removeDuplicatedTags = element => {
	const allowedSelector = allowedTags.map(tag => `${tag}>${tag}`).join(',');
	let nestElements      = [... element.querySelectorAll(allowedSelector)].filter(el => {
		el.parentNode.normalize();
		return el.childNodes.length === 1;
	});
	let replaceCount = 0;
	while (nestElements.length > 0) {
		nestElements.forEach(element => {
			if (element.parentNode.childNodes.length === 1 && element.children.length < 1) {
				element.parentNode.replaceWith(element);
			}
		});
		nestElements = [... element.querySelectorAll(allowedSelector)].filter(el => {
			el.parentNode.normalize();
			return el.childNodes.length === 1;
		});
		if (replaceCount++ > 1023) break;
	}
};



/* --- 入力したらボタンをハイライト --- */
const highlightExportButton = () => {
	const button = document.getElementById('export-html');
	if (!button.classList.contains('btn-primary')) {
		button.classList.add('btn-primary');
	}
};
const highlightImportButton = () => {
	const button = document.getElementById('import-html');
	if (!button.classList.contains('btn-primary')) {
		button.classList.add('btn-primary');
	}
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('description-wysiwyg').addEventListener('input', highlightExportButton);
	document.getElementById('description-html').addEventListener('input', highlightImportButton);
});



/* --- テキストエリアを更新したら文字数更新 --- */
const updateCharCount = () => {
	const charCount = document.getElementById('description-html').value.length;
	document.getElementById('char-count').innerText = String(charCount);
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('description-html').addEventListener('input', updateCharCount);
});



/* --- 色の記録 --- */
const recordColorHistory = color => {
	/* 色を記録(データ) */
	const history = JSON.parse(localStorage.getItem('color-history') || '[]');
	const index   = history.indexOf(color);
	if (index > -1) history.splice(index, 1);
	history.unshift(color);
	if (history.length > maxHistoryCount) history.pop();
	localStorage.setItem('color-history', JSON.stringify(history));
	/* 色を記録(ボタン) */
	const parent = document.getElementById('color-history');
	if (index > -1) {
		const button = parent.children[index];
		parent.insertBefore(button, parent.firstElementChild);
	} else {
		const button = document.createElement('button');
		const div    = document.createElement('div');
		button.classList.add('btn', 'color-rect');
		button.title = color;
		button.addEventListener('click', applyColor);
		div.style.backgroundColor = color;
		button.appendChild(div);
		parent.insertBefore(button, parent.firstElementChild);
	}
	if (parent.children.length > maxHistoryCount) parent.lastElementChild.remove();
};
const applyColor = event => {
	const color = event.currentTarget.title;
	const form  = document.getElementById('font-color');
	form.value  = color;
};
document.addEventListener('DOMContentLoaded', () => {
	const history = JSON.parse(localStorage.getItem('color-history') || '[]');
	const parent  = document.getElementById('color-history');
	history.forEach(color => {
		const button = document.createElement('button');
		const div    = document.createElement('div');
		button.classList.add('btn', 'color-rect');
		button.title = color;
		button.addEventListener('click', applyColor);
		div.style.backgroundColor = color;
		button.appendChild(div);
		parent.appendChild(button);
	});
});



/* --- HTMLエディタへのテキスト貼り付け --- */
const pasteText = event => {
	/* テキスト以外はお断り */
	event.preventDefault();
	const text = event.clipboardData.getData('text');
	if (text.length < 1) return;
	/* 挿入 */
	const selection = window.getSelection();
	const textNode  = document.createTextNode(text);
	if (selection.rangeCount < 1) return;
	const range = selection.getRangeAt(0);
	if (!selection.isCollapsed) range.deleteContents();
	range.insertNode(textNode);
	selection.collapseToEnd();
	/* 変化があったことを告げる */
	document.getElementById('export-html').classList.add('btn-primary');
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('description-wysiwyg').addEventListener('paste', pasteText);
});



/* --- モーダル: ちょっとした説明 --- */
const openModalDescription = () => {
	document.getElementById('modal-description').classList.add('active');
};
const closeModal = event => {
	event.preventDefault();
	const modal = event.currentTarget.closest('.modal');
	modal.classList.remove('active');
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('open-description-modal').addEventListener('click', openModalDescription);
	[... document.querySelectorAll('[aria-label="Close"]')].forEach(el => {
		el.addEventListener('click', closeModal);
	});
	if (location.hash.replace('#','').toLowerCase() === 'about') openModalDescription();
});
