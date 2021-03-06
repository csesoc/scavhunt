(function() {
  // Link number input to range input
  let modal = document.getElementById("editModal");
  modal
    .querySelector("input[type=range].slider")
    .addEventListener("input", evt => {
      modal.querySelector("[name=value]").value = evt.target.value;
    });
  modal.querySelector("[name=value]").addEventListener("input", evt => {
    modal.querySelector("input[type=range]").value = evt.target.value;
  });

  let modalSubmission = document.getElementById("editModalSubmission");
  modalSubmission
    .querySelector("input[type=range].slider")
    .addEventListener("input", evt => {
      modalSubmission.querySelector("[name=value]").value = evt.target.value;
    });
    modalSubmission.querySelector("[name=value]").addEventListener("input", evt => {
      modalSubmission.querySelector("input[type=range]").value = evt.target.value;
  });
})();

function openModalEdit(questionId, srcElem) {
  let modal = document.getElementById("editModal");
  let answerInput = modal.querySelector("[name=answer]");

  let isNew = questionId === undefined;
  modal.classList.toggle("editQuestion", !isNew);

  answerInput.value = "";
  answerInput.placeholder = "answer";
  answerInput.required = isNew;

  if (isNew) {
    modal.querySelector("[name=title]").value = "";
    modal.querySelector("[name=category]").value = "";
    modal.querySelector("[name=description]").value = "";
  } else {
    let question = questions[questionId];
    modal.querySelector("[name=title]").value = question.title;
    modal.querySelector("[name=category]").value = question.category;
    modal.querySelector("[name=description]").value = question.description;
    modal.querySelector("[name=value]").value = question.value;
    modal.querySelector("input[type=range]").value = question.value;
  }

  const updateAnswerEvent = function(evt) {
    answerInput.required = true;
    if (answerInput.reportValidity()) {
      answerInput.required = false;
      this.removeEventListener("click", updateAnswerEvent);
      this.classList.add("is-loading");
      fetch("/api/questions/question/editAnswer", {
        method: "post",
        credentials: "include",
        body: JSON.stringify({
          question: questionId,
          answer: answerInput.value
        })
      })
        .then(response => response.json())
        .then(jsonData => {
          this.addEventListener("click", updateAnswerEvent);
          this.classList.remove("is-loading");
          if (jsonData.status) {
            let answerColumn = srcElem.querySelector(".answer");
            if (!answerColumn.children.length) {
              answerColumn.innerText = answerInput.value;
            }
            answerInput.value = "";
          }
        });
    }
  };

  const confirmEvent = function(evt) {
    if (modal.querySelector("form").reportValidity()) {
      modal
        .querySelector("button.confirm")
        .removeEventListener("click", confirmEvent);
      this.classList.add("is-loading");

      let endpoint = isNew ? "submit" : "edit";
      let data = {
        title: modal.querySelector("[name=title]").value,
        category: modal.querySelector("[name=category]").value,
        description: modal.querySelector("[name=description]").value,
        value: modal.querySelector("[name=value]").value || 100
      };

      if (isNew) {
        data.answer = answerInput.value;
      } else {
        data.question = questionId;
      }

      fetch("/api/questions/question/" + endpoint, {
        method: "post",
        credentials: "include",
        body: JSON.stringify(data)
      })
        .then(response => response.json())
        .then(jsonData => {
          this.classList.remove("is-loading");
          modal
            .querySelector("button.confirm")
            .addEventListener("click", confirmEvent);
          location.reload();
        });
    }
  };

  const closeModal = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEvent);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEvent);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEvent);
    modal.classList.remove("is-active");
  };
  const cancelEvent = closeModal;

  modal
    .querySelector(".button[name=updateAnswer]")
    .addEventListener("click", updateAnswerEvent);
  modal.querySelector("button.confirm").addEventListener("click", confirmEvent);
  modal.querySelector("button.cancel").addEventListener("click", cancelEvent);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEvent);

  modal.classList.add("is-active");
}

function dataToRow(data) {
  let row = document.createElement("tr");
  row.name = "question-" + data.id;

  let title = document.createElement("td");
  title.innerText = data.title;
  row.appendChild(title);

  let category = document.createElement("td");
  category.innerText = categories[data.category] || "";
  row.appendChild(category);

  let answer = document.createElement("td");
  answer.classList.add("answer");

  let answerReveal = document.createElement("button");
  answerReveal.classList.add("button", "is-outlined", "is-info");
  answerReveal.innerText = "reveal answer";
  answer.appendChild(answerReveal);
  row.appendChild(answer);

  let points = document.createElement("td");
  points.innerText = data.value;
  row.appendChild(points);

  let solveCount = document.createElement("td");
  solveCount.innerText = (solves[data.id] || []).length;
  row.appendChild(solveCount);

  let edit = document.createElement("td");
  let editBtn = document.createElement("button");
  editBtn.innerText = "edit";
  editBtn.classList.add("button", "is-outlined", "is-info");
  edit.appendChild(editBtn);
  row.appendChild(edit);

  let deleteElem = document.createElement("td");
  let deleteBtn = document.createElement("button");
  deleteBtn.innerText = "delete";
  deleteBtn.classList.add("button", "is-outlined", "is-info");
  deleteElem.appendChild(deleteBtn);
  row.appendChild(deleteElem);

  const answerRevealClickEvent = function() {
    answerReveal.removeEventListener("click", answerRevealClickEvent);
    this.classList.add("is-loading");
    fetch("/api/questions/question/getAnswer", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        question: data.id
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        if (jsonData.status) {
          this.classList.remove("is-loading");
          this.innerText = jsonData.data;
        }
      });
  };

  answerReveal.addEventListener("click", answerRevealClickEvent);
  editBtn.addEventListener("click", function(evt) {
    openModalEdit(data.id, this.parentElement.parentElement);
  });
  deleteBtn.addEventListener("click", function(evt) {
    openModalDeleteQuestion(data.id);
  });

  return row;
}

Promise.all([getQuestionsNormal(), getCategories(), getSolvesAdmin(), getPendingAdmin(), getUsers(), getSubmissions()]).then(
  ([questionsData, categoriesData, solvesData, pendingData, usersData, submissionsData]) => {
    let modal = document.getElementById("editModal");
    let categoryElem = modal.querySelector("select");
    let modalSubmission = document.getElementById("editModalSubmission");
    let modalSubmissionElem = modalSubmission.querySelector("select");

    if (categoriesData.status) {
      for (let data of categoriesData.data || []) {
        categories[data[0]] = data[1];

        let option = document.createElement("option");
        option.value = data[0];
        option.innerText = data[1];
        categoryElem.appendChild(option);

        let submissionOption= document.createElement("option");
        submissionOption.value = data[0];
        submissionOption.innerText = data[1];
        modalSubmissionElem.appendChild(submissionOption);

        const row = document.createElement("tr");
        
        const categoryColumn = document.createElement("td");
        categoryColumn.innerText = data[1];
        row.appendChild(categoryColumn);

        let edit = document.createElement("td");
        let editBtn = document.createElement("button");
        editBtn.innerText = "edit";
        editBtn.classList.add("button", "is-outlined", "is-info");
        edit.appendChild(editBtn);
        row.appendChild(edit);
        
        let deleteElem = document.createElement("td");
        let deleteBtn = document.createElement("button");
        deleteBtn.innerText = "delete";
        deleteBtn.classList.add("button", "is-outlined", "is-info");
        deleteElem.appendChild(deleteBtn);
        row.appendChild(deleteElem);

        document
        .querySelector("[name=categories]")
        .appendChild(row);

        editBtn.addEventListener("click", function(evt) {
          openModalEditCategory(data[0]);
        });
        deleteBtn.addEventListener("click", function(evt) {
          openModalDeleteCategory(data[0]);
        })
      }
    }

    if (solvesData.status && solvesData.data) {
      for ([user, question] of solvesData.data) {
        solves[question] = (solves[question] || []).concat(user);
      }
    }

    if (pendingData.status && pendingData.data) {
      for ([user, question] of pendingData.data) {
        pending[question] = (pending[question] || []).concat(user);
      }
    }

    if (questionsData.status) {
      for (let data of questionsData.data || []) {
        questions[data[0]] = {
          id: data[0],
          title: data[1],
          description: data[2],
          value: data[3],
          category: data[4]
        };
        if (!questionsByCategory.hasOwnProperty(data[4])) {
          questionsByCategory[data[4]] = [];
          questionsByCategory[data[4]].push(data[0]);
        }
        document
          .querySelector("[name=questions]")
          .appendChild(dataToRow(questions[data[0]]));
      }
    }

    if (usersData.status) {
      usersData.data.sort((next, prev) => {
        if (next[1] > prev[1]) {
          return -1;
        } else if (next[1] < prev[1]) {
          return 1;
        } else {
          return 0;
        }
      });

      prepareUsers(usersData.data);

      document.getElementById("sort").addEventListener("change", function() {
        if (!this.value) {
          prepareUsers(usersData.data);
        }
        let [key, sortDsc] = this.value.split("_");
        if (key === "username") {
          usersData.data.sort((next, prev) => {
            if (next[1] > prev[1]) {
              return sortDsc === "desc" ? -1 : 1;
            } else if (next[1] < prev[1]) {
              return sortDsc === "desc" ? 1 : -1;
            } else {
              return 0;
            }
          });
        } else if (key == "points") {
          usersData.data.sort((next, prev) => {
            if (next[2] > prev[2]) {
              return sortDsc === "desc" ? -1 : 1;
            } else if (next[2] < prev[2]) {
              return sortDsc === "desc" ? 1 : -1;
            } else {
              return 0;
            }
          });
        } else {
          // key === "solves"
          usersData.data.sort((next, prev) => {
            if (next[3] > prev[3]) {
              return sortDsc === "desc" ? -1 : 1;
            } else if (next[3] < prev[3]) {
              return sortDsc === "desc" ? 1 : -1;
            } else {
              return 0;
            }
          });
        }
        prepareUsers(usersData.data);
      });
    }

    if (submissionsData.status) {
      for (let data of submissionsData.data || []) {
        submissions[data[0]] = {
          id: data[0],
          title: data[1],
          description: data[2],
          value: data[3],
          category: data[4]
        };
        if (!submissionsByCategory.hasOwnProperty(data[4])) {
          submissionsByCategory[data[4]] = [];
          submissionsByCategory[data[4]].push(data[0]);
        }
        document
          .querySelector("[name=submissions]")
          .appendChild(dataToRowSubmissions(submissions[data[0]]));
      }
    }
  }
);

function prepareUsers(usersData) {
  const users = document.querySelector("[name=users]");
  while (users.firstChild) {
    users.removeChild(users.lastChild);
  }

  for (let data of usersData || []) {
    const row = document.createElement("tr");

    const username = document.createElement("td");
    username.innerText = data[1];
    row.appendChild(username);

    const points = document.createElement("td");
    points.innerText = data[2];
    row.appendChild(points);

    const solves = document.createElement("td");
    solves.innerText = data[3];
    row.appendChild(solves);

    let deleteElem = document.createElement("td");
    let deleteBtn = document.createElement("button");
    deleteBtn.innerText = "delete";
    deleteBtn.classList.add("button", "is-outlined", "is-info");
    deleteElem.appendChild(deleteBtn);
    row.appendChild(deleteElem);

    deleteBtn.addEventListener("click", function(evt) {
      openModalDeleteUser(data[0], data[1])
    })

    users.appendChild(row);
  }
}

function dataToRowSubmissions(data) {
  let row = document.createElement("tr");
  row.name = "question-" + data.id;

  let title = document.createElement("td");
  title.innerText = data.title;
  row.appendChild(title);

  let category = document.createElement("td");
  category.innerText = categories[data.category] || "";
  row.appendChild(category);

  let submission = document.createElement("td");
  submission.classList.add("answer");

  let submissionReveal = document.createElement("button");
  submissionReveal.classList.add("button", "is-outlined", "is-info");
  submissionReveal.innerText = "see submissions";
  submission.appendChild(submissionReveal);
  row.appendChild(submission);

  let points = document.createElement("td");
  points.innerText = data.value;
  row.appendChild(points);

  let solveCount = document.createElement("td");
  solveCount.innerText = (solves[data.id] || []).length;
  row.appendChild(solveCount);

  let pendingCount = document.createElement("td");
  pendingCount.innerText = (pending[data.id] || []).length;
  row.appendChild(pendingCount);

  let edit = document.createElement("td");
  let editBtn = document.createElement("button");
  editBtn.innerText = "edit";
  editBtn.classList.add("button", "is-outlined", "is-info");
  edit.appendChild(editBtn);
  row.appendChild(edit);

  let deleteElem = document.createElement("td");
  let deleteBtn = document.createElement("button");
  deleteBtn.innerText = "delete";
  deleteBtn.classList.add("button", "is-outlined", "is-info");
  deleteElem.appendChild(deleteBtn);
  row.appendChild(deleteElem);

  submissionReveal.addEventListener("click", function() {
    openModalViewSubmissions(data.id, data.title, solveCount, pendingCount);
  });

  editBtn.addEventListener("click", function(evt) {
    openModalEditSubmission(data.id, this.parentElement.parentElement);
  });

  deleteBtn.addEventListener("click", function(evt) {
    openModalDeleteSubmission(data.id);
  });

  return row;
}

function openModalEditCategory(catId) {
  let modal = document.getElementById("editModalCategory");

  let isNew = catId === undefined;
  modal.classList.toggle("editQuestion", !isNew);

  if (isNew) {
    modal.querySelector("[name=category]").value = "";
  } else {
    let cat = categories[catId];
    modal.querySelector("[name=category]").value = cat;
  }

  const confirmEventCategory = function(evt) {
    if (modal.querySelector("form").reportValidity()) {
      modal
        .querySelector("button.confirm")
        .removeEventListener("click", confirmEventCategory);
      this.classList.add("is-loading");

      let endpoint = isNew ? "submit" : "edit";
      let data = {
        category: modal.querySelector("[name=category]").value,
      };

      if (!isNew) {
        data.catId = catId;
      }

      fetch("/api/questions/category/" + endpoint, {
        method: "post",
        credentials: "include",
        body: JSON.stringify(data)
      })
        .then(response => response.json())
        .then(jsonData => {
          this.classList.remove("is-loading");
          modal
            .querySelector("button.confirm")
            .addEventListener("click", confirmEventCategory);
          location.reload();
        });
    }
  };

  const closeModalCategory = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventCategory);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventCategory);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventCategory);
    modal.classList.remove("is-active");
  };

  const cancelEventCategory = closeModalCategory;

  modal.querySelector("button.confirm").addEventListener("click", confirmEventCategory);
  modal.querySelector("button.cancel").addEventListener("click", cancelEventCategory);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventCategory);

  modal.classList.add("is-active");
}

function openModalDeleteCategory(catId) {
  let modal = document.getElementById("deleteModalCategory");

  const text = document.getElementById("delete-category-text");
  text.innerText = `You are trying to delete ${categories[catId]}.`;

  const confirmEventCategory = function(evt) {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventCategory);
    this.classList.add("is-loading");

    fetch("/api/questions/category/delete", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        catId: catId
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        this.classList.remove("is-loading");
        modal
          .querySelector("button.confirm")
          .addEventListener("click", confirmEventCategory);
        location.reload();
      });
  };

  const closeModalCategory = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventCategory);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventCategory);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventCategory);
    modal.classList.remove("is-active");
  };

  const cancelEventCategory = closeModalCategory;

  modal.querySelector("button.confirm").addEventListener("click", confirmEventCategory);
  modal.querySelector("button.cancel").addEventListener("click", cancelEventCategory);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventCategory);

  modal.classList.add("is-active");
}

function openModalDeleteQuestion(question) {
  let modal = document.getElementById("deleteModalQuestion");

  const text = document.getElementById("delete-question-text");
  text.innerText = `You are trying to delete ${questions[question].title}.`;

  const confirmEventQuestion = function(evt) {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventQuestion);
    this.classList.add("is-loading");

    fetch("/api/questions/question/delete", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        question: question
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        this.classList.remove("is-loading");
        modal
          .querySelector("button.confirm")
          .addEventListener("click", confirmEventQuestion);
        location.reload();
      });
  };

  const closeModalQuestion = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventQuestion);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventQuestion);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventQuestion);
    modal.classList.remove("is-active");
  };

  const cancelEventQuestion = closeModalQuestion;

  modal.querySelector("button.confirm").addEventListener("click", confirmEventQuestion);
  modal.querySelector("button.cancel").addEventListener("click", cancelEventQuestion);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventQuestion);

  modal.classList.add("is-active");
}

function openModalDeleteUser(userId, username) {
  let modal = document.getElementById("deleteModalUser");

  const text = document.getElementById("delete-user-text");
  text.innerText = `You are trying to delete ${username}.`;

  const confirmEventUser = function(evt) {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventUser);
    this.classList.add("is-loading");

    fetch("/api/questions/users/delete", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        userId: userId
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        this.classList.remove("is-loading");
        modal
          .querySelector("button.confirm")
          .addEventListener("click", confirmEventUser);
        location.reload();
      });
  };

  const closeModalUser = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventUser);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventUser);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventUser);
    modal.classList.remove("is-active");
  };

  const cancelEventUser = closeModalUser;

  modal.querySelector("button.confirm").addEventListener("click", confirmEventUser);
  modal.querySelector("button.cancel").addEventListener("click", cancelEventUser);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventUser);

  modal.classList.add("is-active");
}

function openModalEditSubmission(submissionId, srcElem) {
  let modal = document.getElementById("editModalSubmission");

  let isNew = submissionId === undefined;
  modal.classList.toggle("editQuestion", !isNew);

  if (isNew) {
    modal.querySelector("[name=title]").value = "";
    modal.querySelector("[name=category]").value = "";
    modal.querySelector("[name=description]").value = "";
  } else {
    let submission = submissions[submissionId];
    modal.querySelector("[name=title]").value = submission.title;
    modal.querySelector("[name=category]").value = submission.category;
    modal.querySelector("[name=description]").value = submission.description;
    modal.querySelector("[name=value]").value = submission.value;
    modal.querySelector("input[type=range]").value = submission.value;
  }

  const confirmEvent = function(evt) {
    if (modal.querySelector("form").reportValidity()) {
      modal
        .querySelector("button.confirm")
        .removeEventListener("click", confirmEvent);
      this.classList.add("is-loading");

      let endpoint = isNew ? "add" : "edit";
      let data = {
        title: modal.querySelector("[name=title]").value,
        description: modal.querySelector("[name=description]").value,
        value: modal.querySelector("[name=value]").value || 100,
        category: modal.querySelector("[name=category]").value
      };

      if (!isNew) {
        data.question = submissionId;
      }

      fetch("/api/questions/special/" + endpoint, {
        method: "post",
        credentials: "include",
        body: JSON.stringify(data)
      })
        .then(response => response.json())
        .then(jsonData => {
          this.classList.remove("is-loading");
          modal
            .querySelector("button.confirm")
            .addEventListener("click", confirmEvent);
          location.reload();
        });
    }
  };

  const closeModal = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEvent);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEvent);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEvent);
    modal.classList.remove("is-active");
  };
  const cancelEvent = closeModal;

  modal.querySelector("button.confirm").addEventListener("click", confirmEvent);
  modal.querySelector("button.cancel").addEventListener("click", cancelEvent);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEvent);

  modal.classList.add("is-active");
}

function openModalDeleteSubmission(submission) {
  let modal = document.getElementById("deleteModalSubmission");

  const text = document.getElementById("delete-submission-text");
  text.innerText = `You are trying to delete ${submissions[submission].title}.`;

  const confirmEvent = function(evt) {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEvent);
    this.classList.add("is-loading");

    fetch("/api/questions/question/delete", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        question: submission
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        this.classList.remove("is-loading");
        modal
          .querySelector("button.confirm")
          .addEventListener("click", confirmEvent);
        location.reload();
      });
  };

  const closeModal = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEvent);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEvent);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEvent);
    modal.classList.remove("is-active");
  };

  const cancelEvent = closeModal;

  modal.querySelector("button.confirm").addEventListener("click", confirmEvent);
  modal.querySelector("button.cancel").addEventListener("click", cancelEvent);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEvent);

  modal.classList.add("is-active");
}

function openModalViewSubmissions(questionId, title, solves, pending) {
  let modal = document.getElementById("viewModalSubmission");
  const titleSubmission = document.getElementById("title-submissions")
  titleSubmission.innerText = `Submissions for ${title}`;

  const body = document.querySelector("[name=view-submissions]");
  fetch("/api/questions/special/solves", {
    method: "post",
    credentials: "include",
    body: JSON.stringify({
      question: questionId
    })
  })
  .then(response => response.json())
  .then(jsonData => {
    while(body.firstChild) {
      body.removeChild(body.lastChild);
    }
    for (let data of jsonData.data || []) {
      const row = document.createElement("tr");

      const user = document.createElement("td");
      user.innerText = data[4];
      row.appendChild(user);

      let change = document.createElement("td");
      let changeBtn = document.createElement("button");
      if (data[3] === 1) {
        changeBtn.innerText = "unapprove";
      } else if (data[3] === 0) {
        changeBtn.innerText = "approve";
      }
      changeBtn.classList.add("button", "is-outlined", "is-info");
      change.appendChild(changeBtn);
      row.appendChild(change);

      let deleteElem = document.createElement("td");
      let deleteBtn = document.createElement("button");
      deleteBtn.innerText = "delete";
      deleteBtn.classList.add("button", "is-outlined", "is-info");
      deleteElem.appendChild(deleteBtn);
      row.appendChild(deleteElem);

      const submission = document.createElement("td");
      submission.innerText = data[2];
      row.appendChild(submission);

      if (data[3] === 1) {
        changeBtn.addEventListener("click", function() {
          unapproveSolve(data[0], data[4], changeBtn, change, solves, pending);
        });
      } else if (data[3] === 0) {
        changeBtn.addEventListener("click", function() {
          approveSolve(data[0], data[4], changeBtn, change, solves, pending);
        });
      }

      deleteBtn.addEventListener("click", function(evt) {
        modal.classList.remove("is-active");
        viewDeleteModalSubmission(data[0], data[1], data[2], modal, row, body);
      });

      body.appendChild(row);

    }
  });

  const closeModalCategory = function() {
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventCategory);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventCategory);
    modal.classList.remove("is-active");
  };

  const cancelEventCategory = closeModalCategory;

  modal.querySelector("button.cancel").addEventListener("click", cancelEventCategory);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventCategory);

  modal.classList.add("is-active");
}

function viewDeleteModalSubmission(solveID, user, submission, parent, row, table) {
  let modal = document.getElementById("viewDeleteModalSubmission");
  const p = document.getElementById("submission-user");

  const text = document.getElementById("delete-category-text");
  text.innerText = `You are trying to delete the following submission by ${user}:\n${submission}`;

  const confirmEventCategory = function(evt) {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventCategory);
    this.classList.add("is-loading");

    fetch("/api/questions/special/delete", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        solve: solveID
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        this.classList.remove("is-loading");
        modal
          .querySelector("button.confirm")
          .addEventListener("click", confirmEventCategory);
        table.removeChild(row);
        modal.classList.remove("is-active");
        parent.classList.add("is-active");
      });
    this.classList.remove("is-loading");
    modal
      .querySelector("button.confirm")
      .addEventListener("click", confirmEventCategory);
  };

  const closeModalCategory = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventCategory);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventCategory);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventCategory);
    modal.classList.remove("is-active");
    parent.classList.add("is-active");
  };

  const cancelEventCategory = closeModalCategory;

  modal.querySelector("button.confirm").addEventListener("click", confirmEventCategory);
  modal.querySelector("button.cancel").addEventListener("click", cancelEventCategory);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventCategory);

  modal.classList.add("is-active");
}

function openModalDeleteQuestion(question) {
  let modal = document.getElementById("deleteModalQuestion");

  const text = document.getElementById("delete-question-text");
  text.innerText = `You are trying to delete ${questions[question].title}.`;

  const confirmEventQuestion = function(evt) {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventQuestion);
    this.classList.add("is-loading");

    fetch("/api/questions/question/delete", {
      method: "post",
      credentials: "include",
      body: JSON.stringify({
        question: question
      })
    })
      .then(response => response.json())
      .then(jsonData => {
        this.classList.remove("is-loading");
        modal
          .querySelector("button.confirm")
          .addEventListener("click", confirmEventQuestion);
        location.reload();
      });
  };

  const closeModalQuestion = function() {
    modal
      .querySelector("button.confirm")
      .removeEventListener("click", confirmEventQuestion);
    modal
      .querySelector("button.cancel")
      .removeEventListener("click", cancelEventQuestion);
    modal
      .querySelector(".modal-background")
      .removeEventListener("click", cancelEventQuestion);
    modal.classList.remove("is-active");
  };

  const cancelEventQuestion = closeModalQuestion;

  modal.querySelector("button.confirm").addEventListener("click", confirmEventQuestion);
  modal.querySelector("button.cancel").addEventListener("click", cancelEventQuestion);
  modal
    .querySelector(".modal-background")
    .addEventListener("click", cancelEventQuestion);

  modal.classList.add("is-active");
}

function approveSolve(solveId, username, button, parent, solves, pending) {
  fetch("/api/questions/special/approve", {
    method: "post",
    credentials: "include",
    body: JSON.stringify({
      solve: solveId,
      username: username
    })
  })
  .then(response => response.json())
  .then(jsonData => {
    if (jsonData.status) {
      button.innerText = 'unapprove';
      solves.innerText = parseInt(solves.innerText) + 1;
      pending.innerText = parseInt(pending.innerText) - 1;
      newButton = button.cloneNode(true);
      newButton.addEventListener("click", function() {
        unapproveSolve(solveId, username, button, parent, solves, pending);
      });
      while (parent.firstChild) {
        parent.removeChild(parent.lastChild);
      }
      parent.appendChild(newButton);
    }
  })
}

function unapproveSolve(solveId, username, button, parent, solves, pending) {
  fetch("/api/questions/special/unapprove", {
    method: "post",
    credentials: "include",
    body: JSON.stringify({
      solve: solveId,
      username: username
    })
  })
  .then(response => response.json())
  .then(jsonData => {
    if (jsonData.status) {
      button.innerText = 'approve';
      solves.innerText = parseInt(solves.innerText) - 1;
      pending.innerText = parseInt(pending.innerText) + 1;
      newButton = button.cloneNode(true);
      newButton.addEventListener("click", function() {
        approveSolve(solveId, username, button, parent, solves, pending);
      });
      while (parent.firstChild) {
        parent.removeChild(parent.lastChild);
      }
      parent.appendChild(newButton);
    }
  })
}
