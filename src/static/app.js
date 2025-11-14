document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Auth UI Elements
  const userIcon = document.getElementById("user-icon");
  const userDropdown = document.getElementById("user-dropdown");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const authNotice = document.getElementById("auth-notice");
  const signupBtn = document.getElementById("signup-btn");
  const loginSection = document.getElementById("login-section");
  const userInfoSection = document.getElementById("user-info-section");
  const userNameSpan = document.getElementById("user-name");

  // Authentication state
  let currentUser = null;
  let authToken = localStorage.getItem("authToken");

  // Authentication functions
  async function checkAuthStatus() {
    if (!authToken) {
      updateUIForLoggedOut();
      return;
    }

    try {
      const response = await fetch("/auth/me", {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        currentUser = user;
        updateUIForLoggedIn(user);
      } else {
        localStorage.removeItem("authToken");
        authToken = null;
        updateUIForLoggedOut();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      updateUIForLoggedOut();
    }
  }

  function updateUIForLoggedIn(user) {
    userNameSpan.textContent = user.name;
    loginSection.classList.add("hidden");
    userInfoSection.classList.remove("hidden");
    authNotice.classList.add("hidden");
    signupBtn.disabled = false;
    signupForm.style.opacity = "1";
    userIcon.title = `Logged in as ${user.name}`;
  }

  function updateUIForLoggedOut() {
    currentUser = null;
    loginSection.classList.remove("hidden");
    userInfoSection.classList.add("hidden");
    authNotice.classList.remove("hidden");
    signupBtn.disabled = true;
    signupForm.style.opacity = "0.6";
    userIcon.title = "Login";
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and dropdown options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants HTML - show delete buttons only for logged-in teachers
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = currentUser 
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if user is logged in)
      if (currentUser) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authToken) {
      showMessage("Please log in to unregister students.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage("Please log in to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to register student. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Authentication event handlers
  userIcon.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  loginBtn.addEventListener("click", () => {
    userDropdown.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    authToken = null;
    currentUser = null;
    userDropdown.classList.add("hidden");
    updateUIForLoggedOut();
    fetchActivities(); // Refresh to hide delete buttons
    showMessage("Logged out successfully.", "info");
  });

  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown.classList.add("hidden");
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ username, password })
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.access_token;
        localStorage.setItem("authToken", authToken);
        currentUser = result.user;
        
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginMessage.classList.add("hidden");
        
        updateUIForLoggedIn(result.user);
        fetchActivities(); // Refresh to show delete buttons
        showMessage(`Welcome, ${result.user.name}!`, "success");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Utility function to show messages
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Initialize app
  checkAuthStatus().then(() => {
    fetchActivities();
  });
});
