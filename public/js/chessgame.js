document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const boardElement = document.querySelector(".chessboard");
  const historyElement = document.getElementById("history");
  const whiteCapturedElement = document.getElementById("white-captured");
  const blackCapturedElement = document.getElementById("black-captured");
  const resetButton = document.getElementById("reset");
  const flipButton = document.getElementById("flip");

  let board = null;
  let isFlipped = false;
  let role = null;

  socket.on("playerRole", (assignedRole) => {
    role = assignedRole;
    if (role === "b") {
      isFlipped = true;
      boardElement.classList.add("flipped");
    }
  });

  socket.on("spectatorRole", () => {
    role = "spectator";
  });

  socket.on("move", (move) => {
    board.move(move);
    updateBoard();
    addMoveToHistory(move);
    updateCapturedPieces();
  });

  socket.on("boardState", (fen) => {
    board.load(fen);
    updateBoard();
  });

  resetButton.addEventListener("click", () => {
    socket.emit("resetGame");
  });

  flipButton.addEventListener("click", () => {
    isFlipped = !isFlipped;
    boardElement.classList.toggle("flipped");
    updateBoard();
  });

  const initBoard = () => {
    board = new Chess();
    boardElement.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const square = document.createElement("div");
        square.classList.add("square");
        square.classList.add((i + j) % 2 === 0 ? "light" : "dark");
        square.dataset.row = i;
        square.dataset.col = j;
        boardElement.appendChild(square);
      }
    }
    updateBoard();
  };

  const updateBoard = () => {
    const squares = document.querySelectorAll(".square");
    squares.forEach((square) => {
      square.innerHTML = "";
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      const piece = board.board()[row][col];
      if (piece) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          piece.color === "w" ? "white" : "black"
        );
        pieceElement.textContent = getPieceUnicode(piece.type, piece.color);
        pieceElement.draggable = true;
        pieceElement.addEventListener("dragstart", handleDragStart);
        pieceElement.addEventListener("dragend", handleDragEnd);
        square.appendChild(pieceElement);
      }
    });
  };

  const getPieceUnicode = (type, color) => {
    const pieces = {
      p: "♙",
      r: "♖",
      n: "♘",
      b: "♗",
      q: "♕",
      k: "♔",
    };
    return color === "w" ? pieces[type] : pieces[type].toLowerCase();
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData(
      "text",
      e.target.parentElement.dataset.row + e.target.parentElement.dataset.col
    );
    setTimeout(() => {
      e.target.classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging");
  };

  boardElement.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  boardElement.addEventListener("drop", (e) => {
    const from = e.dataTransfer.getData("text");
    const to = e.target.dataset.row + e.target.dataset.col;
    const move = {
      from: `${String.fromCharCode(97 + parseInt(from[1]))}${
        8 - parseInt(from[0])
      }`,
      to: `${String.fromCharCode(97 + parseInt(to[1]))}${8 - parseInt(to[0])}`,
    };

    if (board.turn() === "w" && role !== "w") return;
    if (board.turn() === "b" && role !== "b") return;

    if (board.move(move)) {
      socket.emit("move", move);
      updateBoard();
      addMoveToHistory(move);
      updateCapturedPieces();
    }
  });

  const addMoveToHistory = (move) => {
    const moveElement = document.createElement("li");
    moveElement.textContent = `${move.from} - ${move.to}`;
    historyElement.appendChild(moveElement);
    historyElement.scrollTop = historyElement.scrollHeight;
  };

  const updateCapturedPieces = () => {
    const whiteCaptured = [];
    const blackCaptured = [];
    const history = board.history({ verbose: true });

    history.forEach((move) => {
      if (move.captured) {
        if (move.color === "w") {
          blackCaptured.push(getPieceUnicode(move.captured, "b"));
        } else {
          whiteCaptured.push(getPieceUnicode(move.captured, "w"));
        }
      }
    });

    whiteCapturedElement.innerHTML = whiteCaptured.join("");
    blackCapturedElement.innerHTML = blackCaptured.join("");
  };

  socket.on("resetGame", () => {
    board.reset();
    updateBoard();
    historyElement.innerHTML = "";
    whiteCapturedElement.innerHTML = "";
    blackCapturedElement.innerHTML = "";
  });

  initBoard();
});
