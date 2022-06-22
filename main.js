/*
 * ニコ生説明文エディタ メインスクリプト
 */



/* --- 各種定数 --- */
const allowedTags = ['b', 'i', 'u', 's', 'br', 'font'];



/* --- 各種タグを挿入する --- */
const insertTagToSelectedRange = tagName => {
	const selection = window.getSelection();
	if (!selection.rangeCount || !checkParentId(selection.baseNode.parentNode, 'description-wysiwyg')) return;
	const range = selection.getRangeAt(0);
	if (tagName.length > 0) {
		/* タグを挿入する場合 */
		const node     = document.createElement(tagName);
		node.innerHTML = selection.toString();
		range.deleteContents();
		range.insertNode(node);
		range.selectNodeContents(node);
	} else {
		/* 装飾を消す場合 */
		const content  = range.cloneContents().firstChild;
		let diffNode   = selection.baseNode.nextSibling || selection.baseNode;
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
			node.innerHTML = selection.toString();
			range.deleteContents();
			range.insertNode(node);
		} else {
			const node = document.createTextNode(range.toString());
			range.deleteContents();
			range.insertNode(node);
		}
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
