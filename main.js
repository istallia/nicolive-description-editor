/*
 * ニコ生説明文エディタ メインスクリプト
 */



/* --- 各種タグを挿入する --- */
const insertTagToSelectedRange = tagName => {
	const selection = window.getSelection();
	if (!selection.rangeCount || !checkParentId(selection.baseNode.parentNode, 'description-wysiwyg')) return;
	const range = selection.getRangeAt(0);
	if (tagName.length > 0) {
		const node     = document.createElement(tagName);
		node.innerHTML = selection.toString();
		range.deleteContents();
		range.insertNode(node);
	} else {
		const content  = range.cloneContents().firstChild;
		const diffNode = selection.baseNode.nextSibling || selection.baseNode;
		let diffParent = diffNode.parentNode;
		console.log('----------------------------------------');
		console.log((diffNode.tagName || diffNode.parentNode.tagName).toLowerCase());
		console.log(range.toString(), diffNode.textContent);
		if (range.toString() === diffNode.textContent || ['b', 'i', 'u', 's', 'font'].includes((diffNode.tagName || diffNode.parentNode.tagName).toLowerCase())) {
			if (diffNode.nodeName === "#text") {
				range.selectNode(diffNode.parentNode);
				diffParent = diffNode.parentNode.parentNode;
			} else {
				range.selectNode(diffNode);
			}
		}
		if (diffParent.id === 'description-wysiwyg') {
			const node     = document.createElement('div');
			node.innerHTML = selection.toString();
			range.deleteContents();
			range.insertNode(node);
		} else {
			const node = document.createTextNode(range.toString());
			range.deleteContents();
			range.insertNode(node);
		}
		console.log(diffParent);
		diffParent.normalize();
	}
};
document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('set-bold'         ).addEventListener('click', () => insertTagToSelectedRange('b'));
	document.getElementById('set-italic'       ).addEventListener('click', () => insertTagToSelectedRange('i'));
	document.getElementById('set-underline'    ).addEventListener('click', () => insertTagToSelectedRange('u'));
	document.getElementById('set-strikethrough').addEventListener('click', () => insertTagToSelectedRange('s'));
	document.getElementById('reset-style'      ).addEventListener('click', () => insertTagToSelectedRange(''));
});



/* --- 親に当該IDの要素があるか調べる --- */
const checkParentId = (node, targetId) => {
	let targetNode = node;
	while (targetNode.tagName.toLowerCase() !== 'body') {
		if (targetNode.id === targetId) return true;
		targetNode = targetNode.parentNode;
	}
	return false;
};
