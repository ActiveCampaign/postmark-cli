var activeToggleClass = 'is-active'

/**
 * Mode toggles
 */
var mode = document.querySelectorAll('.js-mode')
var currentMode = 'html'

mode.forEach(function(toggle) {
  toggle.addEventListener('click', function(event) {
    // Reset all classes
    mode.forEach(function(modeToggle) {
      // Remove active class from all toggles
      modeToggle.classList.remove(activeToggleClass)

      // Hide all views
      document
        .querySelector('.js-' + modeToggle.dataset.mode)
        .classList.add('is-hidden')
    })

    // Add active class
    currentMode = this.dataset.mode
    this.classList.add(activeToggleClass)

    // Show view
    document
      .querySelector('.js-' + this.dataset.mode)
      .classList.remove('is-hidden')
  })
})

/**
 * View toggles
 */
var view = document.querySelectorAll('.js-view')
var currentView = 'desktop'

view.forEach(function(toggle) {
  // Add click event
  toggle.addEventListener('click', function(event) {
    view.forEach(function(viewToggle) {
      // Remove active class from all toggles
      viewToggle.classList.remove(activeToggleClass)

      document.querySelectorAll('.preview-iframe').forEach(function(item) {
        item.classList.remove('preview-iframe--mobile')
      })
    })

    currentView = this.dataset.view
    this.classList.add(activeToggleClass)

    if (this.dataset.view === 'mobile') {
      document.querySelectorAll('.preview-iframe').forEach(function(item) {
        item.classList.add('preview-iframe--mobile')
      })
    }
  })
})

function keypress(e) {
  var evt = window.event ? event : e

  // ctrl + v
  if (evt.keyCode == 86 && evt.ctrlKey) {
    var view = currentView === 'desktop' ? 'mobile' : 'desktop'
    document.querySelector('.js-view[data-view="' + view + '"]').click()
  }

  // ctrl + m
  if (evt.keyCode == 77 && evt.ctrlKey) {
    var mode = currentMode === 'html' ? 'text' : 'html'
    document.querySelector('.js-mode[data-mode="' + mode + '"]').click()
  }
}

document.onkeydown = keypress

// Manage state when HTML iframe is finished loading
document.querySelector('.js-html').onload = function() {
  // Hide loading indicator
  document.querySelector('.js-loader').classList.add('is-hidden')

  // Add state class to HTML iframe
  this.classList.add('is-loaded')
}

/**
// Tooltip handlers
*/
var tooltipTrigger = document.querySelectorAll('.js-tooltip-trigger')

// Loop through each tooltip trigger
tooltipTrigger.forEach(function(trigger) {
  var showEvents = ['mouseenter', 'focus'];
  var hideEvents = ['mouseleave', 'blur'];

  // Show event
  showEvents.forEach(function(event) {
    trigger.addEventListener(event, function() {
      var selector = '.js-tooltip[data-tooltip="' + trigger.dataset.tooltip + '"]'
      var tooltip = document.querySelector(selector)
      tooltip.setAttribute('data-show', '')
   })
  })

  // Hide event
  hideEvents.forEach(function(event) {
    trigger.addEventListener(event, function() {
      var selector = '.js-tooltip[data-tooltip="' + trigger.dataset.tooltip + '"]'
      var tooltip = document.querySelector(selector)
      tooltip.removeAttribute('data-show')
    })
  })
})
