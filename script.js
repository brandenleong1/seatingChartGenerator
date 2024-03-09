var info;
var gridSize;
var median;
var groups;
var isSwapSeat;
var isSwapStudent;
const order = ['name', 'nickname', 'idNum', 'testScore', 'gender', 'grade', 'needsFront'];

for (let s of document.getElementsByClassName('slider')) {
	updateSlider(s);
	s.addEventListener('input', function() {
		updateSlider(s);
	});
}

function updateSlider(s) {
	for (let i of s.parentElement.querySelectorAll('*')) {
		if (i.classList.contains('yellowText')) {
			i.innerText = s.value;
			break;
		}
	}
}

function parseExcel(file) {
	return new Promise((resolve) => {
		let reader = new FileReader();
		reader.onload = function(e) {
			let data = e.target.result;
			let workbook = XLSX.read(data, {
				type: 'binary'
			});
			workbook.SheetNames.forEach(function(sheetName) {
				let XL_row_object = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
				let json_object = JSON.stringify(XL_row_object);
				let info = JSON.parse(json_object);
				info = info
					.map(value => ({value, sort: Math.random()}))
					.sort((a, b) => a.sort - b.sort)
					.map(({ value }) => value);
				resolve(info.sort((a, b) => {
					let a1 = parseFloat(a.testScore);
					a1 = !isNaN(a1) ? a1 : 0;
					let b1 = parseFloat(b.testScore);
					b1 = !isNaN(b1) ? b1 : 0;
					return a1 - b1;
				}));
			});
		};
		reader.readAsBinaryString(file);
	});
}

async function handleFileSelect(id) {
	var files = document.getElementById(id).files;
	if (files[0]) {
		info = await parseExcel(files[0]);
	}
}

function gridInit(rows, cols) {
	document.getElementById('seatGrid').innerHTML =
		'<h1 style="margin: 0;" contenteditable="true" placeholder="Name this arrangement..."></h1>' +
		('<div class="seatRow">' +
		 '<div class="seat"></div>'.repeat(cols) +
		 '</div>').repeat(rows) +
		'<h2 style="margin: 0; align-self: center;" contenteditable="true" placeholder="Another text box (for reference)..."></h2>';

	for (let e of document.getElementsByClassName('seat')) {
		e.groupID = -1;
		e.student = null;
		e.onclick = function() {
			setSeatGroup(e);
		}
	}
	resizeGrid();
}

function resizeGrid() {
	let rows = document.getElementById('sliderNumRows').value;
	let height = (document.getElementById('seatGrid').getBoundingClientRect().height -
				  (36 + 5) - (5 * (rows - 1)) - (2 * rows) - (10 * rows) - (26 + 5)) / rows;
				  // (h1 + row-margin) + (row-margin * (rows - 1)) + (border-width * rows) + (padding * rows) + (h2 + row-margin)
	let fontSizes = {'Classic View' : 0.2, 'Teacher View' : 0.14, 'Student View' : 0.2};

	for (let seat of document.getElementsByClassName('seat')) {
		let h = Math.min(200, height);
		seat.style.height = h + 'px';
		seat.style.width = h + 'px';
		seat.style.fontSize = h * fontSizes[document.getElementById('changeLayout').innerText] + 'px';
	}
}

window.onresize = resizeGrid;

async function generateGrid() {
	await handleFileSelect('fileUpload');
	// console.log(info);
	
	if (!info) {
		document.getElementById('fileUpload').style.boxShadow = '0 0 10px red';
		setTimeout(function() {
			document.getElementById('fileUpload').style.boxShadow = null;
		}, 250);
		return;
	}
	let [rows, cols] = [document.getElementById('sliderNumRows').value, document.getElementById('sliderNumColumns').value];
	if (info.length > rows * cols) {
		alert('There are more students (' + info.length + ') than desks (' + (rows * cols) + ')!');
		return;
	}
	
	gridInit(rows, cols);
	showGroupSettings();
	if (Array.from(document.getElementsByClassName('seat')).filter((e) => e.groupID != -1).length >= info.length) {
		document.getElementById('generateSeating').style.display = null;
	} else {
		document.getElementById('generateSeating').style.display = 'none';
	}
}

function showGroupSettings() {
	document.getElementById('settings1Column').style.display = 'none';
	document.getElementById('settings2Column').style.display = null;
	median = findMedian();
}

function selectGroup(i) {
	let l = document.querySelectorAll('#colorList > div');
	let sel = document.querySelectorAll('#colorList > div.selected');
	for (let e of sel) {
		e.classList.remove('selected');
	}
	if (i == -1 || i == null) {
		document.getElementById('deleteGroup').style.display = 'none';
		return;
	}
	if (typeof i == 'number') {
		l[i].classList.add('selected');
	} else {
		i.classList.add('selected');
	}
	document.getElementById('deleteGroup').style.display = null;
}

function newGroup() {
	let l = document.querySelectorAll('#colorList > div');
	let d = document.createElement('div');
	let s = document.createElement('span');
	s.innerText = 'Group ' + (l.length + 1) + ':';
	let c = document.createElement('div');
	c.classList.add('colorIcon');
	c.style.backgroundColor = 'hsl(' + Math.random() + 'turn, ' + (Math.random() * 10 + 45) + '%, 50%)';
	
	c.onclick = function() {
		let p = prompt('Enter a custom CSS color value (or "/rand" for a random color).');
		if (p) {
			p = p.trim() == '/rand' ? 'hsl(' + Math.random() + 'turn, ' + (Math.random() * 10 + 45) + '%, 50%)' : p;
			c.style.backgroundColor = p;
			updateGridColors();
			if (document.getElementById('toggleAllNames').innerText == 'Show By Group') {
				generateNameListFull();
			}
		}
	}
	d.appendChild(s);
	d.appendChild(c);
	d.groupID = l.length;
	document.getElementById('colorList').appendChild(d);
	d.onclick = function() {
		selectGroup(this);
	};
	selectGroup(d);
}

function deleteGroup() {
	let sel = document.querySelector('#colorList > div.selected');
	if (sel) {
		let index = sel.groupID;
		let l = Array.from(document.querySelectorAll('#colorList > div')).filter(e => e.groupID > index);
		let l2 = Array.from(document.getElementsByClassName('seat')).filter(e => e.groupID >= index);
		for (let e of l) {
			e.groupID -= 1;
			e.childNodes[0].innerText = 'Group ' + (e.groupID + 1) + ':';
		}
		for (let e of l2) {
			if (e.groupID > index) {
				e.groupID -= 1;
				e.innerText = e.groupID + 1;
			} else {
				e.groupID = -1;
				e.style.backgroundColor = null;
				e.innerText = null;
			}
		}
		sel.remove();
		selectGroup(-1);
	}
}

function setSeatGroup(seat) {
	let s = document.querySelector('#colorList > div.selected');
	if (s) {
		let i = s.groupID;
	
		if (i == seat.groupID) {
			seat.groupID = -1;
			seat.style.backgroundColor = null;
			seat.innerText = null;
		} else if (i != -1) {
			seat.groupID = i;
			seat.style.backgroundColor = s.childNodes[1].style.backgroundColor;
			
			let rgb = seat.style.backgroundColor.replace(/^rgba?\(|\s+|\)$/g, '').split(',');
			let brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);
			seat.style.color = (brightness > 125) ? 'black' : 'white';
			seat.innerText = i + 1;
		}
	
		if (Array.from(document.getElementsByClassName('seat')).filter(e => e.groupID != -1).length >= info.length) {
			document.getElementById('generateSeating').style.display = null;
		} else {
			document.getElementById('generateSeating').style.display = 'none';
		}
	}
}

function nameToRGB(name) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.fillStyle = name;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data;
}

function updateGridColors() {
	if (document.getElementById('changeColor').innerText == 'Full Color') {
		let l = document.querySelectorAll('#colorList > div');
		for (let e of document.getElementsByClassName('seat')) {
			if (e.groupID != -1) {
				e.style.backgroundColor = l[e.groupID].childNodes[1].style.backgroundColor;
			} else {
				e.style.backgroundColor = null;
			}
	
			let rgb = e.style.backgroundColor.replace(/^rgba?\(|\s+|\)$/g, '').split(',');
			rgb = rgb.length == 1 ? Array.from(nameToRGB(rgb)).slice(0, 3) : rgb;
			let brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);
			e.style.color = (brightness > 125) ? 'black' : 'white';
		}
	} else {
		for (let e of document.getElementsByClassName('seat')) {
			e.style.backgroundColor = null;
			e.style.color = null;
		}
	}
}

function findMedian() {
	let scores = [];
	for (let i of info) {
		s = parseFloat(i.testScore);
		scores.push(!isNaN(s) ? s : 0);
	}
	scores = scores.sort((a, b) => a - b);
	let mid = Math.floor(scores.length / 2);
	return scores.length % 2 == 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
}

function generateSeating() {
	for (let e of document.getElementsByClassName('seat')) {
		e.onclick = null;
	}

	for (let e of document.querySelectorAll('#colorList > div')) {
		e.onclick = function() {
			if (document.getElementById('toggleAllNames').innerText == 'Show All Names') {
				selectGroup(this);
				generateNameList();
			}
		};
	}
	selectGroup(-1);

	document.getElementById('newGroup').style.display = 'none';
	document.getElementById('deleteGroup').style.display = 'none';
	document.getElementById('generateSeating').style.display = 'none';
	document.getElementById('flipBoard').style.display = null;
	document.getElementById('createGroupLabel').innerText = null;
	document.getElementById('swapSeats').style.display = null;
	document.getElementById('swapStudents').style.display = null;
	document.getElementById('changeLayout').style.display = null;
	document.getElementById('groupNameList').style.display = null;
	document.getElementById('changeColor').style.display = null;
	document.getElementById('changePrint').style.display = null;

	groups = [];
	for (let i = 0; i < document.querySelectorAll('#colorList > div').length; i++) {
		let g = [];
		for (let e of document.getElementsByClassName('seat')) {
			if (e.groupID == i) {
				g.push(e);
				e.innerText = null;
			}
		}
		if (g) {
			groups.push(g);
		}
	}
	// console.log(groups);

	flipBoard();
	let needsHigh = true;
	while (info.length && Array.from(document.getElementsByClassName('seat')).find((e) => !e.student)) {
		let student;
		if (info.find((e) => e.needsFront)) {
			student = info.splice(info.findIndex((e) => e.needsFront), 1)[0];
			// console.log('front');
		} else {
			if (needsHigh) {
				student = info.splice(info.length - 1, 1)[0];
			} else {
				student = info.splice(0, 1)[0];
			}
			needsHigh = !needsHigh;
		}
		// console.log(student);

		let seat2Err = [];
		let hasPlaced = false;
		seatLoop: for (let seat of document.getElementsByClassName('seat')) {
			if (!seat.student && seat.groupID != -1) {
				seat.student = student;
				// Find group of seat
				groupLoop: for (let group of groups) {
					if (group.includes(seat)) {
						let error = checkGroupError(group);
						if (error ==  0) {
							hasPlaced = true;
							break seatLoop;
						} else {
							seat2Err.push([seat, error]);
						}
						break groupLoop;
					}
				}
				seat.student = null;
			}
		}

		if (!hasPlaced) {
			seat2Err = seat2Err
				.map(value => ({value, sort: Math.random()}))
				.sort((a, b) => a.sort - b.sort)
				.map(({ value }) => value);
			seat2Err = seat2Err.sort((a, b) => a[1] - b[1]);
			seat2Err[0][0].student = student;
		}
	}

	writeStudentNames();
	flipBoard();
}

function checkGroupError(group) {
	let numMale = 0;
	let numFemale = 0;
	let numLowScore = 0;
	let numHighScore = 0;

	for (let e of group) {
		if (e.student) {
			if (e.student.gender == 'M') {
				numMale++;
			} else {
				numFemale++;
			}
			if (e.student.testScore < median) {
				numLowScore++;
			} else {
				numHighScore++;
			}
		}
	}

	let m = group.length / 2 + 0.5;
	return Math.max(0, numMale - m) + Math.max(0, numFemale - m) + Math.max(0, numLowScore - m) + Math.max(0, numHighScore - m);
}

function writeStudentNames() {
	for (let seat of document.getElementsByClassName('seat')) {
		writeStudentName(seat);
	}
}

function writeStudentName(seat) {
	let t = document.getElementById('changeLayout').innerText;
	if (seat.student) {
		let name = seat.student.name.split(', ');
		
		if (t == 'Classic View') {
			seat.innerHTML = '<span>' + name[1] + ' ' + (seat.student.nickname ? '(' + seat.student.nickname + ') ' : '') + name[0] + '</span>';
		} else if (t == 'Teacher View') {
			seat.innerHTML = '<span>' + name[1] + ' ' + (seat.student.nickname ? '(' + seat.student.nickname + ') ' : '') + name[0] + '</span><span>' + seat.student.idNum + '</span><span>' + seat.student.grade + '</span>';
		} else if (t == 'Student View') {
			seat.innerHTML = '<span>' + (seat.student.nickname ? seat.student.nickname : name[1]) + ' ' + name[0] + '</span>';
		} else {
			seat.innerHTML = '<span>ERR</span>';
		}
		
		seat.classList.add('filled');
		seat.addEventListener('click', popupInfo);
		seat.title = order.reduce((a, b) => a + (seat.student[b] ? b + ': ' + seat.student[b] + '\n' : ''), '');
	} else {
		seat.innerHTML = null;
		seat.classList.remove('filled');
		seat.title = null;
		seat.removeEventListener('click', popupInfo);
	}
}

function popupInfo(e) {
	if (!isSwapSeat && !isSwapStudent) {
		alert(order.reduce((a, b) => a + (e.target.student[b] ? b + ': ' + e.target.student[b] + '\n' : ''), ''));
	}
}

function flipBoard() {
	let rows = document.getElementsByClassName('seatRow');
	for (let i = 0; i < Math.floor(rows.length / 2) - 0.5; i++) {
		swapNodes(rows[i], rows[rows.length - 1 - i]);
	}
	for (let row of rows) {
		let seats = row.children;
		for (let i = 0; i < Math.floor(seats.length / 2) - 0.5; i++) {
			swapNodes(seats[i], seats[seats.length - 1 - i]);
		}
	}
	document.getElementById('topBottomLabel').innerText = document.getElementById('topBottomLabel').innerText == 'top' ? 'bottom' : 'top';
}

function swapNodes(node1, node2) {
    const afterNode2 = node2.nextElementSibling;
    const parent = node2.parentNode;
    node1.replaceWith(node2);
    parent.insertBefore(node1, afterNode2);
}

function swapSeats() {
	if (document.getElementById('swapStudents').classList.contains('redButton')) {
		swapStudents();
	}
	
	let b = document.getElementById('swapSeats');
	b.classList.toggle('greenButton');
	isSwapSeat = b.classList.toggle('redButton');
	if (isSwapSeat) {
		b.innerText = 'Swapping';
		for (let s of document.getElementsByClassName('seat')) {
			s.classList.add('swapping');
			s.addEventListener('click', swapSeatsHelper);
		}
	} else {
		b.innerText = 'Swap Seats';
		for (let s of document.getElementsByClassName('seat')) {
			s.classList.remove('swapping');
			s.classList.remove('toSwap');
			s.removeEventListener('click', swapSeatsHelper);
		}
	}
}

function swapSeatsHelper(e) {
	e.target.classList.toggle('toSwap');
	let c = document.getElementsByClassName('toSwap');
	if (c.length == 2) {
		swapNodes(c[0], c[1]);
		c[1].classList.remove('toSwap');
		c[0].classList.remove('toSwap');
	}
}

function swapStudents() {
	if (document.getElementById('swapSeats').classList.contains('redButton')) {
		swapSeats();
	}
	
	let b = document.getElementById('swapStudents');
	b.classList.toggle('greenButton');
	isSwapStudent = b.classList.toggle('redButton');
	if (isSwapStudent) {
		b.innerText = 'Swapping';
		for (let s of document.getElementsByClassName('seat')) {
			s.classList.add('swapping');
			s.addEventListener('click', swapStudentsHelper);
		}
	} else {
		b.innerText = 'Swap Students';
		for (let s of document.getElementsByClassName('seat')) {
			s.classList.remove('swapping');
			s.classList.remove('toSwap');
			s.removeEventListener('click', swapStudentsHelper);
		}
	}
}

function swapStudentsHelper(e) {
	e.target.classList.toggle('toSwap');
	let c = document.getElementsByClassName('toSwap');
	if (c.length == 2) {
		[c[0].student, c[1].student] = [c[1].student, c[0].student];
		writeStudentName(c[0]);
		writeStudentName(c[1]);
		c[1].classList.remove('toSwap');
		c[0].classList.remove('toSwap');
		let d = document.getElementById('toggleAllNames');
		if (d.innerText == 'Show All Names') {
			generateNameList();
		} else {
			generateNameListFull();
		}
	}
}

function changeColor() {
	if (document.getElementById('changeColor').innerText == 'Full Color') {
		document.getElementById('changeColor').innerText = 'Black/White';
	} else {
		document.getElementById('changeColor').innerText = 'Full Color';
	}
	updateGridColors();
}

function changePrint() {
	if (document.getElementById('changePrint').innerText == 'Print Everything') {
		document.getElementById('changePrint').innerText = 'Print Only Grid';
		document.getElementById('printCSS').setAttribute('href', 'print.css');
	} else {
		document.getElementById('changePrint').innerText = 'Print Everything';
		document.getElementById('printCSS').setAttribute('href', '');
	}
}

function changeLayout() {
	let b = document.getElementById('changeLayout');
	let t = b.innerText;
	if (t == 'Classic View') {
		b.innerText = 'Teacher View';
	} else if (t == 'Teacher View') {
		b.innerText = 'Student View';
	} else if (t == 'Student View') {
		b.innerText = 'Classic View';
	}
	writeStudentNames();
	resizeGrid();
	if (document.querySelector('#toggleAllNames').innerText == 'Show All Names') {
		generateNameList();
	} else {
		generateNameListFull();
	}
}

function generateNameList() {
	let l = Array.from(document.querySelectorAll('#colorList > div'));
	let s = document.querySelector('#colorList > div.selected');
	let i = l.indexOf(s);
	
	if (s) {
		document.getElementById('groupNamesLabel').innerText = 'Group ' + (i + 1);
		let l2 = document.getElementById('namesList');
		l2.replaceChildren();
		
		for (let e of document.querySelectorAll('.seat.filled')) {
			if (e.groupID == i) {
				let d = document.createElement('div');
				
				let t = document.getElementById('changeLayout').innerText;
				if (t == 'Classic View') {
					d.innerText = e.student.name;
				} else if (t == 'Teacher View') {
					d.innerText = e.student.name + (e.student.nickname ? ' (' + e.student.nickname + ')' : '');
				} else if (t == 'Student View') {
					let name = e.student.name.split(', ');
					d.innerText = name[0] + ', ' + (e.student.nickname ? e.student.nickname : name[1]);
				} else {
					d.innerText = 'ERR';
				}
				
				l2.appendChild(d);
			}
		}

		Array.from(document.body.querySelectorAll('#namesList > div')).sort(function sort (ea, eb) {
	        let a = ea.textContent.trim();
	        let b = eb.textContent.trim();
	        if (a < b) {
				return -1;
			} else if (a > b) {
				return 1;
			}
	        return 0;
	    }).forEach(function(div) {
	        div.parentElement.appendChild(div);
	    });
	} else {
		document.getElementById('groupNamesLabel').innerText = 'Group X';
		document.getElementById('namesList').replaceChildren();
		
		let d = document.createElement('div');
		d.innerText = 'Select Group...';
		document.getElementById('namesList').appendChild(d);
	}
}

function generateNameListFull() {
	let l = document.querySelectorAll('#colorList > div');
	let l2 = document.getElementById('namesList');
	l2.replaceChildren();
	for (let e of document.querySelectorAll('.seat.filled')) {
		let d = document.createElement('div');

		let t = document.getElementById('changeLayout').innerText;
		if (t == 'Classic View') {
			d.innerText = e.student.name;
		} else if (t == 'Teacher View') {
			d.innerText = e.student.name + (e.student.nickname ? ' (' + e.student.nickname + ')' : '');
		} else if (t == 'Student View') {
			let name = e.student.name.split(', ');
			d.innerText = name[0] + ', ' + (e.student.nickname ? e.student.nickname : name[1]);
		} else {
			d.innerText = 'ERR';
		}

		d.groupID = e.groupID;
		d.style.color = l[e.groupID].childNodes[1].style.backgroundColor;
		l2.appendChild(d);
	}

	Array.from(document.body.querySelectorAll('#namesList > div'))
		.concat(Array.from({length: l.length}, (e, i) => {
			let d = document.createElement('div');
			d.innerText = 'Group ' + (i + 1);
			d.groupID = i;
			d.style.color = l[i].childNodes[1].style.backgroundColor;
			l2.appendChild(d);
			d.isLabel = true;
			d.style.fontWeight = 'bold';
			return d;
		}))
		.sort(function sort (ea, eb) {
			if (ea.groupID < eb.groupID) {
				return -1;
			} else if (ea.groupID > eb.groupID) {
				return 1;
			}
			if (ea.isLabel) {
				return -1;
			} else if (eb.isLabel) {
				return 1;
			}
			let a = ea.textContent.trim();
			let b = eb.textContent.trim();
			if (a < b) {
				return -1;
			} else if (a > b) {
				return 1;
			}
			return 0;
		})
		.forEach(function(div) {
			div.parentElement.appendChild(div);
		});
}

function toggleAllNames() {
	let d = document.getElementById('toggleAllNames');
	if (d.innerText == 'Show All Names') {
		d.innerText = 'Show By Group';
		selectGroup(-1);
		document.getElementById('groupNamesLabel').parentNode.style.display = 'none';
		generateNameListFull();
	} else {
		d.innerText = 'Show All Names';
		document.getElementById('groupNamesLabel').parentNode.style.display = null;
		generateNameList();
	}
}