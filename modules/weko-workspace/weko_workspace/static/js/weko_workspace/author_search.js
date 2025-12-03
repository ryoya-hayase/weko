(function() {
  'use strict';

  // Global object for reset
  window.appAuthorSearch = window.appAuthorSearch || {};
  window.appAuthorSearch.namespace = window.appAuthorSearch.namespace || {};
  window.appAuthorSearch.namespace.resetSearchData = function() {
    $('#add-author-panel').hide();
    $('#author-search-panel').show();
    $('#search-key').val('');
    $('#author-table-body').empty();
    $('#author-pagination').empty();
    toggleNoResultAlert(false);
    currentPage = 1;
    totalPages = 1;
    lastSearchKey = '';
    lastNumOfPage = 25;
  };

  // Variables
  let currentPage = 1;
  let totalPages = 1;
  let lastSearchKey = '';
  let lastNumOfPage = 25;
  let placeholderForDate = "yyyy-mm-dd";
  let searchJson = {};
  let langOptions = [
    { id: 'ja', value: 'ja' },
    { id: 'ja-Kana', value: 'ja-Kana' },
    { id: 'en', value: 'en' },
    { id: 'fr', value: 'fr' },
    { id: 'it', value: 'it' },
    { id: 'de', value: 'de' },
    { id: 'es', value: 'es' },
    { id: 'zh-cn', value: 'zh-cn' },
    { id: 'zh-tw', value: 'zh-tw' },
    { id: 'ru', value: 'ru' },
    { id: 'la', value: 'la' },
    { id: 'ms', value: 'ms' },
    { id: 'eo', value: 'eo' },
    { id: 'ar', value: 'ar' },
    { id: 'el', value: 'el' },
    { id: 'ko', value: 'ko' }
  ];
  let authorIdOptions = [
    { id: '2', name: 'ORCID' },
    { id: '3', name: 'ResearcherID' },
    { id: '4', name: 'Other' }
  ];
  let communityOptions = [];
  let affiliationIdOptions = [];

  // Data model
  let authorData = getDefaultAuthorData();

  // Error handler
  function handleError(error) {
    console.error('Sorry, an unknown error has occurred!', error);
    return Promise.reject(error && error.message ? error.message : error);
  }

  /**
   * Get default author data
   */
  function getDefaultAuthorData() {
    return {
      authorNameInfo: [{ 
        familyName: "",
        firstName: "",
        fullName: "",
        language: "ja-Kana",
        nameFormat: "familyNmAndNm",
        nameShowFlg: "true"
      }],
      authorIdInfo: [{
        idType: "2",
        authorId: "",
        authorIdShowFlg: "true" 
      }],
      emailInfo: [{ email: "" }],
      communityIds: [""],
      affiliationInfo: [{
        identifierInfo: [{
          affiliationIdType: "1",
          affiliationId: "",
          identifierShowFlg: "true"
        }],
        affiliationNameInfo: [{
          affiliationName: "",
          affiliationNameLang: "ja",
          affiliationNameShowFlg: "true"
        }],
        affiliationPeriodInfo: [{
          periodStart: null,
          periodEnd: null 
        }]
      }],
    };
  }

  /**
   * Toggle "no results" alert
   * @param show {boolean} Whether to show the alert
   */
  function toggleNoResultAlert(show) {
    let alertDiv = document.getElementById('no-result-alert');
    if (show) {
      alertDiv.textContent = window.langJson.Author_Search_No_Result[1];
      alertDiv.style.display = '';
    } else {
      alertDiv.style.display = 'none';
    }
  }

  /**
   * Set i18n
   * @param lang {string} Language code
   * @param callback {function} Callback function
   */
  function setI18n(lang, callback) {
    let js = document.scripts;
    let jsUrl = js[js.length - 1].src;
    let strUrl = jsUrl.substring(0, jsUrl.lastIndexOf('static'));
    let jsonUrl = strUrl + "static/json/weko_items_ui/translations/" + lang + "/messages.json";
    $.getJSON(jsonUrl, function(res) { callback(res); });
  }

  /**
   * Set author i18n
   * @param lang {string} Language code
   * @param callback {function} Callback function
   */
  function setAuthorI18n(lang, callback) {
    let js = document.scripts;
    let jsUrl = js[js.length - 1].src;
    let strUrl = jsUrl.substring(0, jsUrl.lastIndexOf('static'));
    let jsonUrl = strUrl + "static/json/weko_authors/translations/" + lang + "/messages.json";
    $.getJSON(jsonUrl, function(res) { callback(res); });
  }

  /**
   * Get data of managed communities
   */
  function getDataOfManagedCommunities() {
    let urlArr = window.location.href.split('/');
    const url = urlArr[0] + "//" + urlArr[2] + "/api/authors/managed_communities";
    return fetch(url)
      .then(function(res) { return res.json(); })
      .catch(handleError);
  }

  /**
   * Get managed communities
   */
  function getManagedCommunities() {
    return getDataOfManagedCommunities().then(function(data) {
      if (!data) return data;
      window.isAdmin = !!data.isAdmin;
      communityOptions = (data.communityIds || []).map(function(com) { return { id: com, name: com }; });
      window.activityCommunityId = data.activityCommunityId;
      if (window.activityCommunityId && !communityOptions.some(function(c) { return c.id === window.activityCommunityId; })) {
        communityOptions.push({ id: window.activityCommunityId, name: window.activityCommunityId });
      }
      if (window.activityCommunityId) {
        if (!window.authorData) window.authorData = {};
        window.authorData.communityIds = [window.activityCommunityId];
      }
      return data;
    }).catch();
  }

  /**
   * Fetch author ID options
   */
  function fetchAuthorIdOptions() {
    const url = window.location.origin + '/api/authors/search_prefix';
    return fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data)) authorIdOptions = data;
      })
      .catch(handleError);
  }

  /**
   * Fetch affiliation settings
   */
  function fetchAuthorsAffiliationSettings() {
    let urlArr = window.location.href.split('/');
    const url = urlArr[0] + '//' + urlArr[2] + '/api/authors/search_affiliation';
    return fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (Array.isArray(data)) affiliationIdOptions = data;
      })
      .catch(handleError);
  }

  /**
   * Get page info for pagination
   * @param total {number} Total number of items
   * @param numberOfpage {number} Number of items per page
   * @param pageNumber {number} Current page number
   * @param displayPageNo {number} Number of pages to display
   * @returns {Array<number>} List of page numbers to display
   */
  function setPageInfo(total, numberOfpage, pageNumber, displayPageNo) {
    let pageList = [];
    let totalPageNo = Math.max(1, Math.ceil(total / numberOfpage));
    displayPageNo = Math.min(displayPageNo || 9, totalPageNo);
    let curPage = pageNumber - 1;
    let margin = Math.floor(displayPageNo / 2);
    let minPage = curPage - margin;
    let maxPage = curPage + margin;
    if (minPage < 0) {
      maxPage -= minPage;
      minPage = 0;
    }
    if (maxPage >= totalPageNo) {
      minPage -= maxPage - totalPageNo + 1;
      if (minPage < 0) {
        minPage = 0;
      }
      maxPage = totalPageNo - 1;
    }
    for (let i = minPage; i <= maxPage; i++) {
      pageList.push(i + 1);
    }
    return pageList;
  }

  /**
   * Render pagination
   * @param current {number} Current page number
   * @param totalPages {number} Total number of pages
   * @param totalCount {number} Total number of items
   * @param numOfPage {number} Number of items per page
   */
  function renderPagination(current, totalPages, totalCount, numOfPage) {
    let $pagination = $('#author-pagination');
    $pagination.empty();
    $pagination.append('<li' + (current === 1 ? ' class="disabled"' : '') + '><a href="#" data-page="' + (current - 1) + '">&lt;</a></li>');
    let pageList = setPageInfo(totalCount, numOfPage, current, 9);
    pageList.forEach(function(pageNum) {
      $pagination.append('<li' + (pageNum === current ? ' class="active"' : '') + '><a href="#" data-page="' + pageNum + '">' + pageNum + '</a></li>');
    });
    $pagination.append('<li' + (current === totalPages ? ' class="disabled"' : '') + '><a href="#" data-page="' + (current + 1) + '">&gt;</a></li>');
  }

  /**
   * Get page data via API
   * @param searchJsonObj {Object} Search parameters
   * @returns {Promise<Object>} Promise resolving to the search results
   */
  function getPageDataJson(searchJsonObj) {
    let urlArr = window.location.href.split('/');
    const url = urlArr[0] + "//" + urlArr[2] + "/api/authors/search";
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchJsonObj)
    })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .catch(handleError);
  }

  /**
   * Get author data by id
   * @param hitId {string} Author ID
   * @returns {Promise<Object>} Promise resolving to the author data
   */
  function getjpcoarJson(hitId) {
    let urlArr = window.location.href.split('/');
    const url = urlArr[0] + "//" + urlArr[2] + "/api/authors/input";
    let jsonObj = { id: hitId };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonObj)
    })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .catch(handleError);
  }

  /**
   * Set display data for table
   * @param searchJson {Object} Search results JSON
   * @returns {Array<Object>} Array of display data objects
   */
  function setDisplayData(searchJson) {
    let displayData = [];
    if (searchJson.hits && searchJson.hits.hits.length !== 0) {
      searchJson.hits.hits.forEach(function(data) {
        let subData = {
          authorNameInfo: { authorName: "" },
          authorIdInfo: { authorId: "" },
          emailInfo: { email: "" },
        };
        if (data._source.hasOwnProperty("authorNameInfo")) {
          let nameInfo = "";
          data._source.authorNameInfo.forEach(function(d) {
            if (d.nameFormat == "familyNmAndNm") {
              let name = [d.familyName, d.firstName].join(' ').trim();
              nameInfo += name + "<br>";
            } else {
              nameInfo += d.fullName + "<br>";
            }
          });
          subData.authorNameInfo.authorName = nameInfo;
        }
        if (data._source.hasOwnProperty("authorIdInfo")) {
          let idInfo = "";
          data._source.authorIdInfo.forEach(function(d) {
            idInfo += d.authorId + "<br>";
          });
          subData.authorIdInfo.authorId = idInfo;
        }
        if (data._source.hasOwnProperty("emailInfo")) {
          let emailInfo = "";
          data._source.emailInfo.forEach(function(d) {
            emailInfo += d.email + "<br>";
          });
          subData.emailInfo.email = emailInfo;
        }
        displayData.push(subData);
      });
    }
    return displayData;
  }

  /**
   * Render author table
   * @param displayData {Array<Object>} Array of display data objects
   * @param langJson {Object} Language JSON for localization
   */
  function renderTable(displayData, langJson) {
    let $tbody = $('#author-table-body');
    $tbody.empty();
    $tbody.off('click', '[id^=input_button_]');
    displayData.forEach(function(data, i) {
      let row = '<tr>' +
        '<td>' + data.authorNameInfo.authorName + '</td>' +
        '<td>' + data.emailInfo.email + '</td>' +
        '<td class="textRight">' +
        '<button type="button" id="input_button_' + i + '" class="btn btn-info btn-import">' +
        (langJson.Author_Import ? langJson.Author_Import[1] : 'Import') +
        '</button></td></tr>';
      $tbody.append(row);
    });
    $tbody.on('click', '[id^=input_button_]', function() {
      let i = parseInt(this.id.replace('input_button_', ''), 10);
      getjpcoarJson(searchJson.hits.hits[i]._id).then(function(json_data) {
        let send_data = JSON.stringify(json_data);
        window.parent.postMessage({ type: 'IMPORT_AUTHOR_DATA', authorData: send_data }, '*');
      });
    });
  }

  /**
   * Search authors
   * @param pageNumber {number} Page number
   * @param searchKey {string} Search keyword
   * @param numOfPage {number} Number of items per page
   */
  function searchAuthors(pageNumber, searchKey, numOfPage) {
    toggleNoResultAlert(false);
    currentPage = pageNumber;
    lastSearchKey = searchKey;
    lastNumOfPage = numOfPage;
    let searchJsonObj = {
      searchKey: searchKey,
      pageNumber: pageNumber,
      numOfPage: numOfPage,
      sortKey: '',
      sortOrder: ''
    };
    getPageDataJson(searchJsonObj).then(function(res) {
      searchJson = res;
      let displayData = setDisplayData(res);
      renderTable(displayData, window.langJson || {});
      let totalCount = res.hits && res.hits.total ? res.hits.total : displayData.length;
      totalPages = Math.ceil(totalCount / numOfPage);
      renderPagination(pageNumber, totalPages, totalCount, numOfPage);
      if (!displayData.length) {
        toggleNoResultAlert(true);
      } else {
        toggleNoResultAlert(false);
      }
    }).catch(function() {
      alert('Sorry, an unknown error has occurred!');
    });
  }

  /**
   * Message event handler
   * @param event {MessageEvent} Message event
   */
  function handleAuthorSearchMessage(event) {
    if (event.data) {
      if (event.data.type === 'RESET_AUTHOR_SEARCH') {
        // Reset search data
        if (window.appAuthorSearch 
          && window.appAuthorSearch.namespace 
          && typeof window.appAuthorSearch.namespace.resetSearchData === 'function') {
            window.appAuthorSearch.namespace.resetSearchData();
        }
      } else if (event.data.type === 'CLOSE_AUTHOR_SEARCH') {
        // Close author search
        if ($('#add-author-panel').is(':visible')) {
          $('#add-author-panel').hide();
          $('#author-search-panel').show();
        } else {
          window.parent.postMessage({ type: 'CLOSE_AUTHOR_MODAL' }, '*');
        }
      }
    } 
  }

  /**
   * Change authorData to proper JSON
   * @returns {Object} Formatted author data JSON
   */
  function changeJson() {
    let a = JSON.stringify(authorData);
    let b = a
    let jsonStrCopy = JSON.parse(b);

    // Format authorNameInfo
    for (let i = 0; i < jsonStrCopy.authorNameInfo.length; i++) {
      if (jsonStrCopy.authorNameInfo[i].familyName == ""
        && jsonStrCopy.authorNameInfo[i].firstName == ""
        && jsonStrCopy.authorNameInfo[i].fullName == ""
      ) {
        jsonStrCopy.authorNameInfo.splice(i, 1);
      } else {
        if (jsonStrCopy.authorNameInfo[i].familyName != ""
          && jsonStrCopy.authorNameInfo[i].firstName != ""
          && jsonStrCopy.authorNameInfo[i].fullName == ""
        ) {
          jsonStrCopy.authorNameInfo[i].fullName = jsonStrCopy.authorNameInfo[i].familyName + " " + jsonStrCopy.authorNameInfo[i].firstName;
        }
      }
    }
    // Format authorIdInfo
    for (let i = 0; i < jsonStrCopy.authorIdInfo.length; i++) {
      if (jsonStrCopy.authorIdInfo[i].authorId == "") {
        jsonStrCopy.authorIdInfo.splice(i, 1);
      }
    }
    // Format emailInfo
    for (let i = 0; i < jsonStrCopy.emailInfo.length; i++) {
      if (jsonStrCopy.emailInfo[i].email == "") {
        jsonStrCopy.emailInfo.splice(i, 1);
      }
    }
    // Format affiliationInfo
    for (let affiliationIndex = 0; affiliationIndex < jsonStrCopy.affiliationInfo.length; affiliationIndex++){
      if (jsonStrCopy.affiliationInfo[affiliationIndex].affiliation == "") {
        jsonStrCopy.affiliationInfo.splice(affiliationIndex, 1);
      }
    }
    // Format communityIds
    for (let i = 0; i < jsonStrCopy.communityIds.length; i++) {
      if (jsonStrCopy.communityIds[i] == "") {
        jsonStrCopy.communityIds.splice(i, 1);
      }
    }
    return jsonStrCopy;
  }

  /**
   * Post page data via API
   * @param authorJsonObj {Object} Author data JSON object
   * @returns {Promise<Object>} Promise resolving to the response
   */
  function postPageDataJson(authorJsonObj) {
    let urlArr = window.location.href.split('/');
    const url = urlArr[0] + "//" + urlArr[2] + "/api/authors/add";

    return new Promise(function(resolve, reject) {
      $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(authorJsonObj),
        success: function(res) { resolve(res); },
        error: function(xhr) {
          reject(xhr.responseJSON || xhr);
        }
      });
    });
  }

  // Register message event handler
  window.addEventListener('message', handleAuthorSearchMessage, false);
  document.addEventListener('DOMContentLoaded', function() {
    window.removeEventListener('message', handleAuthorSearchMessage, false);
    window.addEventListener('message', handleAuthorSearchMessage, false);
  });

  // Initialization
  $(function() {
    let lang = $('#lang-code', window.parent.document).val() || 'ja';
    setI18n(lang, function(res) {
      $('#add-author-btn').text(res.Author_Add_Author[1]);
      $('#search-btn').text(res.Author_Search[1]);
      $('#table-name').text(res.Author_Name[1]);
      $('#table-mail-address').text(res.Author_Mail_Address[1]);
      window.langJson = res;
    });
    setAuthorI18n(lang, function(res) {
      $('#add-author-title').text(res.Author_Add_New_Author[1]);
      $('#author-name-label').text(res.Author_Name[1]);
      $('#author-id-label').text(res.Author_ID[1]);
      $('#author-email-label').text(res.Author_EMail[1]);
      $('#author-community-label').text(res.Author_Community[1]);
      $('#add-author-name-btn').text('+ ' + res.Author_Add_Author_Item[1]);
      $('#add-author-id-btn').text('+ ' + res.Author_Add_Author_ID[1]);
      $('#add-author-email-btn').text('+ ' + res.Author_Add_EMail[1]);
      $('#add-author-community-btn').text('+ ' + res.Author_Add_Community[1]);
      $('#add-author-affiliation-btn').text('+ ' + res.Author_Add_Affiliation[1]);
      $('#clear-author-btn').text(res.Author_Button_Clear[1]);
      $('#save-author-btn').text(res.Author_Button_Save[1]);
      window.authorLangJson = res;
      fetchAuthorIdOptions().then(function() {
        getManagedCommunities().then(function() {
          fetchAuthorsAffiliationSettings().then(function() {
            renderAuthorNames();
            renderAuthorIds();
            renderAuthorEmails();
            renderCommunities();
            renderAffiliations();
          });
        });
      });
    });
    // Resize observer for author-search-container
    if (window.authorSearchResizeObserver) window.authorSearchResizeObserver.disconnect();
    let container = document.getElementById('author-search-container');
    if (container && window.ResizeObserver) {
      window.authorSearchResizeObserver = new ResizeObserver(function(entries) {
        for (let entry of entries) {
          let height = entry.contentRect.height;
          window.parent.postMessage({ type: 'AUTHOR_SEARCH_IFRAME_HEIGHT', height: height }, '*');
        }
      });
      window.authorSearchResizeObserver.observe(container);
    }

    // Add button event
    $(document).on('click', '#add-author-btn', function() {
      $('#author-search-panel').hide();
      $('#add-author-panel').show();
    });

    // Pagination click event
    $(document).on('click', '#author-pagination li:not(.disabled):not(.active) a', function(e) {
      e.preventDefault();
      let page = parseInt($(this).data('page'), 10);
      if (!isNaN(page) && page > 0 && page !== currentPage) {
        searchAuthors(page, lastSearchKey, lastNumOfPage);
      }
    });

    // Search button event
    $(document).on('click', '#search-btn', function() {
      let searchKey = $('#search-key').val().replace('　', ' ');
      let numberOfpage = parseInt($('#display-number').val(), 10) || 25;
      searchAuthors(1, searchKey, numberOfpage);
    });

    // Alert close button event
    $(document).on('click', '#alerts_search_author .alert .close', function() {
      $(this).closest('.alert').remove();
    });

    // Add author name
    $(document).on('click', '#add-author-name-btn', function() {
      authorData.authorNameInfo.push({ ...getDefaultAuthorData().authorNameInfo[0] });
      renderAuthorNames();
    });

    // Delete author name
    $(document).on('click', '.remove-author-name', function() {
      let idx = $(this).data('index');
      if (authorData.authorNameInfo.length > 1) {
        authorData.authorNameInfo.splice(idx, 1);
      } else {
        // If only one item, just clear the value
        authorData.authorNameInfo[0] = { ...getDefaultAuthorData().authorNameInfo[0] };
      }
      renderAuthorNames();
    });

    // Add author ID
    $(document).on('click', '#add-author-id-btn', function() {
      authorData.authorIdInfo.push({ ...getDefaultAuthorData().authorIdInfo[0] });
      renderAuthorIds();
    });

    // Delete author ID
    $(document).on('click', '.remove-author-id', function() {
      let idx = $(this).data('index');
      if (authorData.authorIdInfo.length > 1) {
        authorData.authorIdInfo.splice(idx, 1);
      } else {
        // If only one item, just clear the value
        authorData.authorIdInfo[0] = { ...getDefaultAuthorData().authorIdInfo[0] };
      }
      renderAuthorIds();
    });

    // Author ID type change event
    $(document).on('change', '.author-id-type', function() {
      var idx = $(this).data('index');
      var idType = $(this).val();
      authorData.authorIdInfo[idx].idType = idType;
    });

    // Author ID input event
    $(document).on('input', '#author-ids input.author-id-input', function() {
      let idx = $(this).data('index');
      let field = $(this).data('field');
      authorData.authorIdInfo[idx][field] = $(this).val();
      // Directly toggle button enabled/disabled state
      let $btn = $(this).closest('.divBottom').find('.confirm-author-id[data-index="' + idx + '"]');
      if ($(this).val()) {
        $btn.prop('disabled', false);
      } else {
        $btn.prop('disabled', true);
      }
    });

    // Author ID confirm button
    $(document).on('click', '#author-ids .confirm-author-id', function() {
      let idx = $(this).data('index');
      let idType = authorData.authorIdInfo[idx].idType;
      let authorId = authorData.authorIdInfo[idx].authorId;
      let url_identifier = "";
      authorIdOptions.forEach(function(opt) {
        if (opt.id == idType) {
          url_identifier = opt.url;
        }
      });
      if (url_identifier != "") {
        window.open(url_identifier.replace(/#+$/, authorId), "_blank");
      } else {
        $('#alerts_search_author').append(
          '<div class="alert alert-danger" id="">' +
          '<button type="button" class="close" data-dismiss="alert">' +
          '&times;</button>' + authorLangJson.Author_Confirm_Msg[1] + '</div>');
      }
    });

    // Add email
    $(document).on('click', '#add-author-email-btn', function() {
      authorData.emailInfo.push({ ...getDefaultAuthorData().emailInfo[0] });
      renderAuthorEmails();
    });

    // Delete email
    $(document).on('click', '.remove-author-email', function() {
      let idx = $(this).data('index');
      if (authorData.emailInfo.length > 1) {
        authorData.emailInfo.splice(idx, 1);
      } else {
        // If only one item, just clear the value
        authorData.emailInfo[0] = { ...getDefaultAuthorData().emailInfo[0] };
      }
      renderAuthorEmails();
    });

    // Add community
    $(document).on('click', '#add-author-community-btn', function() {
      authorData.communityIds.push('');
      renderCommunities();
    });

    // Delete community
    $(document).on('click', '.remove-author-community', function() {
      let idx = $(this).data('index');
      if (authorData.communityIds.length > 1) {
        authorData.communityIds.splice(idx, 1);
      } else {
        // If only one item, just clear the value
        authorData.communityIds[0] = '';
      }
      renderCommunities();
    });

    // Add affiliation
    $(document).on('click', '#add-author-affiliation-btn', function() {
      const def = getDefaultAuthorData().affiliationInfo[0];
      authorData.affiliationInfo.push({
        identifierInfo: [ { ...def.identifierInfo[0] } ],
        affiliationNameInfo: [ { ...def.affiliationNameInfo[0] } ],
        affiliationPeriodInfo: [ { ...def.affiliationPeriodInfo[0] } ]
      });
      renderAffiliations();
    });

    // Delete affiliation
    $(document).on('click', '.remove-affiliation', function() {
      let idx = $(this).data('index');
      if (authorData.affiliationInfo.length > 1) {
        authorData.affiliationInfo.splice(idx, 1);
      } else {
        // If only one item, just clear the value
        const def = getDefaultAuthorData().affiliationInfo[0];
        authorData.affiliationInfo[0] = {
          identifierInfo: [ { ...def.identifierInfo[0] } ],
          affiliationNameInfo: [ { ...def.affiliationNameInfo[0] } ],
          affiliationPeriodInfo: [ { ...def.affiliationPeriodInfo[0] } ]
        };
      }
      renderAffiliations();
    });

    // Add affiliation identifier
    $(document).on('click', '.add-aff-identifier', function() {
      let affIdx = $(this).data('index');
      // Keep existing values
      if (!Array.isArray(authorData.affiliationInfo[affIdx].identifierInfo)) authorData.affiliationInfo[affIdx].identifierInfo = [];
      authorData.affiliationInfo[affIdx].identifierInfo.push({ ...getDefaultAuthorData().affiliationInfo[0].identifierInfo[0] });
      renderAffIdentifiers(affIdx);
    });

    // Delete affiliation identifier
    $(document).on('click', '.remove-aff-identifier', function() {
      let affIdx = $(this).data('aff-index');
      let idx = $(this).data('index');
      if (authorData.affiliationInfo && authorData.affiliationInfo[affIdx] && Array.isArray(authorData.affiliationInfo[affIdx].identifierInfo)) {
        if (authorData.affiliationInfo[affIdx].identifierInfo.length > 1) {
          authorData.affiliationInfo[affIdx].identifierInfo.splice(idx, 1);
        } else {
          // If only one item, just clear the value
          authorData.affiliationInfo[affIdx].identifierInfo[0] = { ...getDefaultAuthorData().affiliationInfo[0].identifierInfo[0] };
        }
        renderAffIdentifiers(affIdx);
      }
    });

    // Add affiliation name
    $(document).on('click', '.add-aff-name', function() {
      let affIdx = $(this).data('index');
      // Keep existing values
      if (!Array.isArray(authorData.affiliationInfo[affIdx].affiliationNameInfo)) authorData.affiliationInfo[affIdx].affiliationNameInfo = [];
      authorData.affiliationInfo[affIdx].affiliationNameInfo.push({ ...getDefaultAuthorData().affiliationInfo[0].affiliationNameInfo[0] });
      renderAffNames(affIdx);
    });

    // Delete affiliation name
    $(document).on('click', '.remove-aff-name', function() {
      let affIdx = $(this).data('aff-index');
      let idx = $(this).data('index');
      if (authorData.affiliationInfo && authorData.affiliationInfo[affIdx] && Array.isArray(authorData.affiliationInfo[affIdx].affiliationNameInfo)) {
        if (authorData.affiliationInfo[affIdx].affiliationNameInfo.length > 1) {
          authorData.affiliationInfo[affIdx].affiliationNameInfo.splice(idx, 1);
        } else {
          // If only one item, just clear the value
          authorData.affiliationInfo[affIdx].affiliationNameInfo[0] = { ...getDefaultAuthorData().affiliationInfo[0].affiliationNameInfo[0] };
        }
        renderAffNames(affIdx);
      }
    });

    // Add affiliation period
    $(document).on('click', '.add-aff-period', function() {
      let affIdx = $(this).data('index');
      // Keep existing values
      if (!Array.isArray(authorData.affiliationInfo[affIdx].affiliationPeriodInfo)) authorData.affiliationInfo[affIdx].affiliationPeriodInfo = [];
      authorData.affiliationInfo[affIdx].affiliationPeriodInfo.push({ ...getDefaultAuthorData().affiliationInfo[0].affiliationPeriodInfo[0] });
      renderAffPeriods(affIdx);
    });

    // Delete affiliation period
    $(document).on('click', '.remove-aff-period', function() {
      let affIdx = $(this).data('aff-index');
      let idx = $(this).data('index');
      if (authorData.affiliationInfo && authorData.affiliationInfo[affIdx] && Array.isArray(authorData.affiliationInfo[affIdx].affiliationPeriodInfo)) {
        if (authorData.affiliationInfo[affIdx].affiliationPeriodInfo.length > 1) {
          authorData.affiliationInfo[affIdx].affiliationPeriodInfo.splice(idx, 1);
        } else {
          // If only one item, just clear the value
          authorData.affiliationInfo[affIdx].affiliationPeriodInfo[0] = { ...getDefaultAuthorData().affiliationInfo[0].affiliationPeriodInfo[0] };
        }
        renderAffPeriods(affIdx);
      }
    });
    // Clear
    $(document).on('click', '#clear-author-btn', function() {
      authorData = getDefaultAuthorData();
      renderAuthorNames();
      renderAuthorIds();
      renderAuthorEmails();
      renderCommunities();
      renderAffiliations();
    });

    // Save
    $(document).on('click', '#save-author-btn', function() {
      let dbJson = changeJson();

      postPageDataJson(dbJson).then(res => {
        alert(res.msg);
        $('#add-author-panel').hide();
        $('#author-search-panel').show();
      }).catch(err => {
        alert(JSON.parse(err._body).msg);
      });
    })
  });

  /**
   * Render author name fields
   */
  function renderAuthorNames() {
    let $area = $('#author-names');
    $area.empty();
    authorData.authorNameInfo.forEach(function(name, i) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-9 col-md-9 remove-padding-right">';
      // Switch by nameFormat
      if (name.nameFormat !== 'fullNm') {
        html += '<input type="text" class="form-control add-author-surname" placeholder="セイ" value="' + (name.familyName || '') + '" data-index="' + i + '" data-field="familyName">';
        html += '<input type="text" class="form-control add-author-name" placeholder="メイ" value="' + (name.firstName || '') + '" data-index="' + i + '" data-field="firstName">';
      } else {
        html += '<input type="text" class="form-control add-author-fullname" placeholder="セイ,メイ" value="' + (name.fullName || '') + '" data-index="' + i + '" data-field="fullName">';
      }
      // Language select
      html += '<select class="form-control add-author-lang-option" data-index="' + i + '" data-field="language">';
      langOptions.forEach(function(opt) {
        html += '<option value="' + opt.id + '"' + (name.language === opt.id ? ' selected' : '') + '>' + opt.value + '</option>';
      });
      html += '</select>';
      // Name format select
      html += '<select class="form-control add-author-name-option" data-index="' + i + '" data-field="nameFormat">';
      html += '<option value="familyNmAndNm"' + (name.nameFormat === 'familyNmAndNm' ? ' selected' : '') + '>' + window.authorLangJson.Author_familyNmAndNm[1] + '</option>';
      html += '</select>';
      html += '</div>';
      // Show/hide radio
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<div class="col-sm-12 col-md-12 alignCenter remove-padding-right">';
      html += '<input type="radio" name="authorNameRadio_' + i + '" value="true"' + (name.nameShowFlg === 'true' ? ' checked' : '') + ' data-index="' + i + '" data-field="nameShowFlg">&nbsp;' + window.authorLangJson.Author_Display[1];
      html += '<input type="radio" name="authorNameRadio_' + i + '" value="false"' + (name.nameShowFlg === 'false' ? ' checked' : '') + ' data-index="' + i + '" data-field="nameShowFlg">&nbsp;' + window.authorLangJson.Author_Hide[1];
      html += '</div>';
      html += '</div>';
      // Delete button
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-author-name" data-index="' + i + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div></div>';
      $area.append(html);
    });
    // Input event handler
    $area.off('input.authorName change.authorName').on('input.authorName change.authorName', 'input,select', function() {
      let idx = $(this).data('index');
      let field = $(this).data('field');
      if (field) {
        authorData.authorNameInfo[idx][field] = $(this).val();
      }
    });
  }

  /**
   * Render author ID fields
   */
  function renderAuthorIds() {
    let $area = $('#author-ids');
    $area.empty();
    authorData.authorIdInfo.forEach(function(id, i) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      // idType select
      html += '<select class="form-control author-id-type" data-index="' + i + '" data-field="idType">';
      authorIdOptions.forEach(function(opt) {
        if (opt.name !== 'WEKO') {
          html += '<option value="' + opt.id + '"' + (id.idType === opt.id ? ' selected' : '') + '>' + opt.name + '</option>';
        }
      });
      html += '</select>';
      html += '</div>';
      // Author ID input
      html += '<div class="col-sm-6 col-md-6 remove-padding-right">';
      html += '<input type="text" class="form-control author-id-input" placeholder="" value="' + (id.authorId || '') + '" data-index="' + i + '" data-field="authorId">';
      html += '</div>';
      // Confirm button
      html += '<div class="col-sm-1 col-md-1 remove-padding-right">';
      html += '<div class="col-sm-12 col-md-12 alignCenter remove-padding-right remove-padding-left">';
      html += '<button type="button" class="btn btn-info btn-sm confirm-author-id" data-index="' + i + '"' + (id.authorId ? '' : ' disabled') + '>' + window.authorLangJson.Author_Confirm[1] + '</button>';
      html += '</div>';
      html += '</div>';
      // Show/hide radio
      html += '<div class="col-sm-2 col-md-2 alignCenter remove-padding-right">';
      html += '<div class="col-sm-12 col-md-12 alignCenter remove-padding-right">';
      html += '<input type="radio" name="authorIdRadio_' + i + '" value="true"' + (id.authorIdShowFlg === 'true' ? ' checked' : '') + ' data-index="' + i + '" data-field="authorIdShowFlg">&nbsp;' + window.authorLangJson.Author_Display[1];
      html += '<input type="radio" name="authorIdRadio_' + i + '" value="false"' + (id.authorIdShowFlg === 'false' ? ' checked' : '') + ' data-index="' + i + '" data-field="authorIdShowFlg">&nbsp;' + window.authorLangJson.Author_Hide[1];
      html += '</div>';
      html += '</div>';
      // Delete button
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-author-id" data-index="' + i + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div></div>';
      $area.append(html);
    });
  }

  /**
   * Render author email fields
   */
  function renderAuthorEmails() {
    let $area = $('#author-emails');
    $area.empty();
    authorData.emailInfo.forEach(function(email, i) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right">';
      html += '<input type="text" class="form-control author-email-input" placeholder="" value="' + (email.email || '') + '" data-index="' + i + '" data-field="email">';
      html += '</div>';
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-author-email" data-index="' + i + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      $area.append(html);
    });
    // Input event handler
    $area.off('input.authorEmail').on('input.authorEmail', 'input.author-email-input', function() {
      let idx = $(this).data('index');
      authorData.emailInfo[idx].email = $(this).val();
    });
  }

  /**
   * Render community fields
   */
  function renderCommunities() {
    let $area = $('#author-communities');
    $area.empty();
    authorData.communityIds = authorData.communityIds || [''];
    authorData.communityIds.forEach(function(val, i) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right">';
      html += '<select class="form-control community-select" data-index="' + i + '" data-field="community">';
      communityOptions.forEach(function(opt) {
        html += '<option value="' + opt.id + '"' + (val === opt.id ? ' selected' : '') + '>' + opt.name + '</option>';
      });
      html += '</select>';
      html += '</div>';
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-author-community" data-index="' + i + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      $area.append(html);
    });
    // Set selectedIndex=-1 if not selected
    $area.find('select.community-select').each(function(idx, el) {
      if (!authorData.communityIds[idx]) {
        el.selectedIndex = -1;
      }
    });
    // Input event handler
    $area.off('change.authorCommunity').on('change.authorCommunity', 'select.community-select', function() {
      let idx = $(this).data('index');
      authorData.communityIds[idx] = $(this).val();
    });
  }

  /**
   * Render affiliation fields (main)
   */
  function renderAffiliations() {
    let $area = $('#author-affiliations');
    $area.empty();
    authorData.affiliationInfo = authorData.affiliationInfo || [];
    authorData.affiliationInfo.forEach(function(aff, i) {
      let html = '<div class="panel panel-default affiliation-panel">';
      html += '<div class="col-sm-12 col-md-12 remove-padding-right">';
      html += '<div class="col-sm-1 col-md-1 remove-padding-right"></div>';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right remove-padding-left">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right"></div>';
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-affiliation" data-index="' + i + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '<div class="panel-body remove-padding-right remove-padding-left">';
      html += '<div class="col-sm-12 col-md-12">';
      html += '<br>';
      // Affiliation Identifiers
      html += '<div class="row">';
      html += '<div class="col-sm-12 col-md-12">';
      html += '<div class="col-sm-1 col-md-1 textRight remove-padding-right">' + window.authorLangJson.Author_Identifier[1] + '</div>';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right remove-padding-left">';
      html += '<div id="aff-identifiers-' + i + '"></div>';
      html += '<div class="row">';
      html += '<div class="col-sm-11 col-md-11 textRight remove-padding-right">';
      html += '<button type="button" class="btn btn-link add-aff-identifier" data-index="' + i + '">+ ' + window.authorLangJson.Author_Add_Identifier[1] + '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '<br>';
      // Affiliation Name
      html += '<div class="row">';
      html += '<div class="col-sm-12 col-md-12 remove-padding-right">';
      html += '<div class="col-sm-1 col-md-1 textRight remove-padding-right"></div>';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right remove-padding-left">';
      html += '<div id="aff-names-' + i + '"></div>';
      html += '<div class="row">';
      html += '<div class="col-sm-11 col-md-11 textRight remove-padding-right">';
      html += '<button type="button" class="btn btn-link add-aff-name" data-index="' + i + '">+ ' + window.authorLangJson.Author_Add_Affiliation_Name[1] + '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      // Affiliation period
      html += '<div class="row">';
      html += '<div class="col-sm-12 col-md-12 remove-padding-right">';
      html += '<div class="col-sm-1 col-md-1 textRight remove-padding-right">' + window.authorLangJson.Author_Affiliation_Period[1] + '</div>';
      html += '<div class="col-sm-11 col-md-11 remove-padding-right remove-padding-left">';
      html += '<div id="aff-periods-' + i + '"></div>';
      html += '<div class="row">';
      html += '<div class="col-sm-11 col-md-11 textRight remove-padding-right">';
      html += '<button type="button" class="btn btn-link add-aff-period" data-index="' + i + '">+ ' + window.authorLangJson.Author_Add_Affiliation_Period[1] + '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      $area.append(html);
      // Render sub fields
      renderAffIdentifiers(i);
      renderAffNames(i);
      renderAffPeriods(i);
    });
  }

  /**
   * Render affiliation identifier subfields
   */
  function renderAffIdentifiers(affIdx) {
    let $area = $('#aff-identifiers-' + affIdx);
    $area.empty();
    let arr = authorData.affiliationInfo[affIdx].identifierInfo = authorData.affiliationInfo[affIdx].identifierInfo || [];
    arr.forEach(function(item, j) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<select class="form-control aff-identifier-type" data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="affiliationIdType">';
      affiliationIdOptions.forEach(function(opt) {
        html += '<option value="' + opt.id + '"' + (item.affiliationIdType === opt.id ? ' selected' : '') + '>' + opt.name + '</option>';
      });
      html += '</select>';
      html += '</div>';
      html += '<div class="col-sm-6 col-md-6 remove-padding-right">';
      html += '<input type="text" class="form-control aff-identifier-input" placeholder="" value="' + (item.affiliationId || '') + '" data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="affiliationId">';
      html += '</div>';
      html += '<div class="col-sm-1 col-md-1 remove-padding-right">';
      html += '<div class="col-sm-12 col-md-12 alignCenter remove-padding-right remove-padding-left">';
      html += '<button type="button" class="btn btn-info btn-sm confirm-affiliation-id" data-aff-index="' + affIdx + '" data-index="' + j + '"' + (item.affiliationId ? '' : ' disabled') + '>' + window.authorLangJson.Author_Confirm[1] + '</button>';
      html += '</div>';
      html += '</div>';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<div class="col-sm-12 col-md-12 alignCenter remove-padding-right">';
      html += '<input type="radio" name="affiliationIdRadio_' + affIdx + '_' + j + '" value="true"' + (item.identifierShowFlg === 'true' ? ' checked' : '') + ' data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="identifierShowFlg">&nbsp;' + window.authorLangJson.Author_Display[1];
      html += '<input type="radio" name="affiliationIdRadio_' + affIdx + '_' + j + '" value="false"' + (item.identifierShowFlg === 'false' ? ' checked' : '') + ' data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="identifierShowFlg">&nbsp;' + window.authorLangJson.Author_Hide[1];
      html += '</div>';
      html += '</div>';
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-aff-identifier" data-aff-index="' + affIdx + '" data-index="' + j + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      $area.append(html);
    });
    // Input/select/radio event handler
    $area.off('input.affIdentifier change.affIdentifier').on('input.affIdentifier change.affIdentifier', 'input,select', function() {
      let affIdx = $(this).data('aff-index');
      let idx = $(this).data('index');
      let field = $(this).data('field');
      if (authorData.affiliationInfo && authorData.affiliationInfo[affIdx] && authorData.affiliationInfo[affIdx].identifierInfo && authorData.affiliationInfo[affIdx].identifierInfo[idx]) {
        authorData.affiliationInfo[affIdx].identifierInfo[idx][field] = $(this).val();
      }
      // Enable/disable confirm button
      let $btn = $(this).closest('.divBottom').find('.confirm-affiliation-id[data-aff-index="' + affIdx + '"][data-index="' + idx + '"]');
      if (authorData.affiliationInfo[affIdx].identifierInfo[idx].affiliationId) {
        $btn.prop('disabled', false);
      } else {
        $btn.prop('disabled', true);
      }
    });
    $area.off('click', '.confirm-affiliation-id').on('click', '.confirm-affiliation-id', function() {
      let $btn = $(this);
      let affIdx = $btn.data('aff-index');
      let idx = $btn.data('index');
      let affiliationIdType = authorData.affiliationInfo[affIdx].identifierInfo[idx].affiliationIdType;
      let authorId = authorData.affiliationInfo[affIdx].identifierInfo[idx].affiliationId;
      let url_identifier = "";
      affiliationIdOptions.forEach(function(opt) {
        if (opt.id == affiliationIdType) {
          url_identifier = opt.url;
        }
      });
      if (url_identifier != "") {
        window.open(url_identifier.replace(/#+$/, authorId), "_blank");
      } else {
        $('#alerts_search_author').append(
          '<div class="alert alert-danger" id="">' +
          '<button type="button" class="close" data-dismiss="alert">' +
          '&times;</button>' + authorLangJson.Author_Confirm_Msg[1] + '</div>');
      }
    });
  }

  /**
   * Render affiliation name subfields
   */
  function renderAffNames(affIdx) {
    let $area = $('#aff-names-' + affIdx);
    $area.empty();
    let arr = authorData.affiliationInfo[affIdx].affiliationNameInfo = authorData.affiliationInfo[affIdx].affiliationNameInfo || [];
    arr.forEach(function(item, j) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right"></div>';
      html += '<div class="col-sm-5 col-md-5 remove-padding-right">';
      html += '<input type="text" class="form-control aff-name-input" placeholder="" value="' + (item.affiliationName || '') + '" data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="affiliationName">';
      html += '</div>';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<select class="form-control aff-name-lang-option" data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="affiliationNameLang">';
      langOptions.forEach(function(opt) {
        html += '<option value="' + opt.id + '"' + (item.affiliationNameLang === opt.id ? ' selected' : '') + '>' + opt.value + '</option>';
      });
      html += '</select>';
      html += '</div>';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<div class="col-sm-12 col-md-12 alignCenter remove-padding-right">';
      html += '<input type="radio" name="affiliationNameRadio_' + affIdx + '_' + j + '" value="true"' + (item.affiliationNameShowFlg === 'true' ? ' checked' : '') + ' data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="affiliationNameShowFlg">&nbsp;' + window.authorLangJson.Author_Display[1];
      html += '<input type="radio" name="affiliationNameRadio_' + affIdx + '_' + j + '" value="false"' + (item.affiliationNameShowFlg === 'false' ? ' checked' : '') + ' data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="affiliationNameShowFlg">&nbsp;' + window.authorLangJson.Author_Hide[1];
      html += '</div>';
      html += '</div>';
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-aff-name" data-aff-index="' + affIdx + '" data-index="' + j + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      $area.append(html);
    });
    // Input event handler
    $area.off('input.affName change.affName').on('input.affName change.affName', 'input.aff-name-input,select.aff-name-lang-option,input[type=radio][name^=affiliationNameRadio_]', function() {
      let affIdx = $(this).data('aff-index');
      let idx = $(this).data('index');
      let field = $(this).data('field');
      if (authorData.affiliationInfo && authorData.affiliationInfo[affIdx] && authorData.affiliationInfo[affIdx].affiliationNameInfo && authorData.affiliationInfo[affIdx].affiliationNameInfo[idx]) {
        authorData.affiliationInfo[affIdx].affiliationNameInfo[idx][field] = $(this).val();
      }
    });
  }

  /**
   * Render affiliation period subfields
   */
  function renderAffPeriods(affIdx) {
    let $area = $('#aff-periods-' + affIdx);
    $area.empty();
    let arr = authorData.affiliationInfo[affIdx].affiliationPeriodInfo = authorData.affiliationInfo[affIdx].affiliationPeriodInfo || [];
    arr.forEach(function(item, j) {
      let html = '<div class="">';
      html += '<div class="col-sm-12 col-md-12 divBottom remove-padding-right">';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right"></div>';
      html += '<div class="col-sm-1 col-md-1 remove-padding-right"></div>';
      html += '<div class="col-sm-1 col-md-1 textRight remove-padding-right">' + window.authorLangJson.Author_Affiliation_Period_Start[1] + '</div>';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<input type="text" class="form-control aff-period-start" placeholder="' + placeholderForDate + '" value="' + (item.startDate || '') + '" data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="startDate">';
      html += '</div>';
      html += '<div class="col-sm-1 col-md-1 textRight remove-padding-right">' + window.authorLangJson.Author_Affiliation_Period_End[1] + '</div>';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right">';
      html += '<input type="text" class="form-control aff-period-end" placeholder="' + placeholderForDate + '" value="' + (item.endDate || '') + '" data-aff-index="' + affIdx + '" data-index="' + j + '" data-field="endDate">';
      html += '</div>';
      html += '<div class="col-sm-2 col-md-2 remove-padding-right"></div>';
      html += '<div class="col-sm-1 col-md-1">';
      html += '<button type="button" class="close delButton remove-aff-period" data-aff-index="' + affIdx + '" data-index="' + j + '">';
      html += '<span class="glyphicon glyphicon-remove"></span>';
      html += '</button>';
      html += '</div>';
      html += '</div>';
      $area.append(html);
    });
    // Input event handler
    $area.off('input.affPeriod').on('input.affPeriod', 'input.aff-period-start,input.aff-period-end', function() {
      let affIdx = $(this).data('aff-index');
      let idx = $(this).data('index');
      let field = $(this).data('field');
      if (authorData.affiliationInfo && authorData.affiliationInfo[affIdx] && authorData.affiliationInfo[affIdx].affiliationPeriodInfo && authorData.affiliationInfo[affIdx].affiliationPeriodInfo[idx]) {
        authorData.affiliationInfo[affIdx].affiliationPeriodInfo[idx][field] = $(this).val();
      }
    });
  }
})();
