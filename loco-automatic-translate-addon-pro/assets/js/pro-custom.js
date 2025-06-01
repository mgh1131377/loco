const AutoTranslator = (function (window, $, gTranslateWidget) {
    // get Loco Translate global object.  
    const locoConf = window.locoConf;
    // get plugin configuration object.
    const configData = window.extradata;
    let translationPerformed = false;
    const { ajax_url: ajaxUrl, nonce: nonce, ATLT_URL: ATLT_URL, extra_class: rtlClass , api_key: apikey ,api_key_url: apikeyurl} = configData;
    const allStrings = locoConf.conf.podata;
    onLoad();
    function onLoad() {
        if (locoConf && locoConf.conf) {
            const { conf } = locoConf;        
            // get all string from loco translate po data object
            allStrings.shift();
            const { locale, project } = conf;
            // create a project ID for later use in ajax request.
            const projectId = generateProjectId(project, locale);
            // create strings modal
            createStringsModal(projectId, 'yandex');
            createStringsModal(projectId, 'google');
            createStringsModal(projectId, 'deepl');
            createStringsModal(projectId, 'chatGPT');
            createStringsModal(projectId, 'geminiAI');
            addStringsInModal(allStrings);
        }
    }

    function initialize() {
        
                const { conf } = locoConf;
        const { locale, project } = conf;
        const projectId = generateProjectId(project, locale);
        // Embbed Auto Translate button inside Loco Translate editor
        if ($("#loco-editor nav").find("#cool-auto-translate-btn").length === 0) {
            addAutoTranslationBtn();
        }

        //append auto translate settings model
        settingsModel();

        // on auto translate button click settings model
        $("#cool-auto-translate-btn").on("click", openSettingsModel);

        // open translation provider model 
        $("button.icon-robot[data-loco='auto']").on("click", openTranslationProviderModel);

        // open model with Yandex Translate Widget
        $("#atlt_yandex_translate_btn").on("click", function () {
            openYandexTranslateModel(locale);
        });
        // open Model with Google Translate Widget
        $("#atlt_google_translate_btn").on("click", function () {
            openGoogleTranslateModel(locale);
        });

        // on langauge change translate strings and run scrolling
        $("#google_translate_element").change(function () {
            gTranslateWidgetOnChange();
        });

        // open model with DeepL Translate Widget
        $("#atlt_deepl_btn").on("click", function () {
            openDeepLTranslateModel(locale);
        });

        // on click Download Docx button in deepl model
        $("#download_deepl_doc").on("click", function () {
            generateDocFile(this);
        });

        // open model with DeepL Translate Widget
        $("#atlt_chatGPT_btn").on("click", function () {
            const max_size = 100;
            const parts = [];
            let currentTab = 0;
            const source_String = {};
            const translatedObj = [];
            var plainStrArr = filterRawObject(allStrings, "plain");
            for (let i = 0; i < plainStrArr.length; i++) {
                source_String[i + 1] = plainStrArr[i].source;
            }
            openChatGPTTranslateModel(locale, projectId, max_size, parts, currentTab, translatedObj, source_String);
        });

        $("#atlt_geminiAI_btn").on("click", function () {
            opengeminiAITranslateModel()
        });

        $("#atlt_geminiAI_addApikey_btn").on("click", function () {
            window.location.href = apikeyurl
        });

      function opengeminiAITranslateModel(){
            let modelContainer = $('div#geminiAI-widget-model.geminiAI-widget-container');
            $("#atlt-dialog").dialog("close");
            modelContainer.fadeIn("slow");
            modelContainer.find('.notice, .inline, .notice-info, .is-dismissible').show();
        }

        const filterstring = filterRawObject(allStrings,"plain")
        const sourceValues = filterstring.map(item => item.source);
        const selectedStringsBatches = calculateTokensInBatches(sourceValues);

        $("#geminiAI_translate_button").on("click", function () {
            ajaxCall(selectedStringsBatches,locale,sourceValues)
         });

        // save string inside cache for later use
        $(".atlt_save_strings").on("click", onSaveClick);
    }

    function addStringsInModal(allStrings) {
        var plainStrArr = filterRawObject(allStrings, "plain");
        if (plainStrArr.length > 0) {
            printStringsInPopup(plainStrArr, type = "yandex");
            printStringsInPopup(plainStrArr, type = "google");
            printStringsInPopup(plainStrArr, type = "geminiAI");
        } else {
            $("#ytWidget").hide();
            $(".notice-container")
                .addClass('notice inline notice-warning')
                .html("There is no plain string available for translations.");
            $(".atlt_string_container, .choose-lang, .atlt_save_strings, #google_translate_element, .translator-widget,.chatGPT_save_close, .chatGPT_save_cont, .notice-info, .is-dismissible").hide();
        }
    }

    // create project id for later use inside ajax request.
    function generateProjectId(project, locale) {
        const { domain } = project || {};
        const { lang, region } = locale; 
        return project ? `${domain}-${lang}-${region}` : `temp-${lang}-${region}`;
    }



    function calculateTokensInBatches(strings) {
        const maxStrings = 45;
        const maxTokens = 300;
        let selectedStringsBatch = [];
        let totalTokensBatch = 0;
        let selectedStringsBatches = [];
    
        // Loop through each string to calculate tokens and organize them into batches
        for (let i = 0; i < strings.length; i++) {
            const length = strings[i].length;
            const tokens = Math.ceil(length / 4);
            
            // Check if adding the current string exceeds the maximum number of strings
            if (selectedStringsBatch.length + 1 > maxStrings) {
                selectedStringsBatches.push(selectedStringsBatch);
                selectedStringsBatch = [];
                totalTokensBatch = 0;
            }
    
            // Add the string to the current batch if it doesn't exceed the maximum tokens
            if (totalTokensBatch + tokens <= maxTokens) {
                selectedStringsBatch.push(strings[i]);
                totalTokensBatch += tokens;
            } else {
                // If adding the string exceeds the maximum tokens, start a new batch
                selectedStringsBatches.push(selectedStringsBatch);
                selectedStringsBatch = [strings[i]];
                totalTokensBatch = tokens;
            }
        }
    
        // Add the last batch if it contains any strings
        if (selectedStringsBatch.length > 0) {
            selectedStringsBatches.push(selectedStringsBatch);
        }
        return selectedStringsBatches;
    }   

    function ajaxCall(sourceValues, locale, allSourceValues) {
        const container = $("#geminiAI-widget-model");
        const totalSourceCount = allSourceValues.length;
        let isModalAppended = false;
        let translatedResponse = [];
        let totalTranslatedCount = 0;
        let currentIndex = 0;
        let stopProcess = true;
        let stopResponse = false;
        container.find(".atlt_translate_progress").fadeIn("slow");
        container.find('.progress-wrapper').show();
        const BATCH_SIZE = 15;
        const DELAY = 0; // 15 seconds in milliseconds
    
        // Function to make AJAX request for each chunk of strings
        function makeAjaxRequest(chunk) {
            const data = {
                action: 'my_ajax_handler',
                source_data: {
                    locale: locale,
                    source: chunk,
                }
            };
    
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: ajaxUrl,
                    type: 'POST',
                    data: data,
                    success: function (response) {
                        if (!stopResponse) {
                            if (!response.success && response.data === 429) {
                                stopProcess = false;
                                stopResponse = true;
                                container.find(".atlt_translate_limitexceed").fadeIn("slow");
                                container.find(".atlt_translate_progress").fadeOut("slow");
                                resolve();
                                return;
                            }
                        }
    
                        if (response.success && response.data) {
                            let translatedStrings = response.data;
                            translatedResponse.push(Boolean(translatedStrings));
    
                            let source = [];
                            let target = [];
                            const regex = /(?:\\{1,2}u([0-9a-fA-F]{4})|\\u([0-9a-fA-F]{4}))/g;
    
                            const processStrings = (eachData) => {
                                if (!eachData.source) return;
    
                                const decodeUnicode = (str) =>
                                    str.replace(regex, (match, p1, p2) => String.fromCharCode(parseInt(p1 || p2, 16)));
    
                                let cleanedSource = decodeUnicode(eachData.source).replace(/\\/g, '');
                                let cleanedTarget = decodeUnicode(eachData.target).replace(/\\/g, '');
    
                                if (allSourceValues.includes(cleanedSource)) {
                                    source.push(cleanedSource);
                                    target.push(cleanedTarget);
                                }
                            };
    
                            if (Array.isArray(translatedStrings)) {
                                translatedStrings.forEach(processStrings);
                            } else if (typeof translatedStrings === 'object') {
                                for (let key in translatedStrings) {
                                    if (translatedStrings.hasOwnProperty(key)) {
                                        processStrings(translatedStrings[key]);
                                    }
                                }
                            }
    
                            let tbody = '';
                            for (let j = 0; j < source.length; j++) {
                                tbody += `<tr id="${currentIndex}"><td>${currentIndex + 1}</td><td class="notranslate source">${encodeHtmlEntity(source[j])}</td>`;
                                tbody += `<td class="target translate">${encodeHtmlEntity(target[j])}</td></tr>`;
                                currentIndex++;
                            }
    
                            totalTranslatedCount += source.length;
                            let progressBar = container.find("#myProgressBar");
                            let progressValue = Math.round((totalTranslatedCount / totalSourceCount) * 100);
                            let progressText = container.find("#progressText");
    
                            progressBar.css('width', `${progressValue}%`);
                            progressText.text(`${progressValue}%`);
    
                            if (!isModalAppended) {
                                container.find(".atlt_strings_table > tbody.atlt_strings_body").html('');
                                isModalAppended = true;
                            }
                            container.find(".atlt_strings_table > tbody.atlt_strings_body").append(tbody);
                        }
                        resolve();
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        console.error('AJAX Error: ' + errorThrown);
                        reject(errorThrown);
                    }
                });
            });
        }
    
        // Function to process chunks in batches with delay
        async function processChunksInBatches() {
            try {
                for (let i = 0; i < sourceValues.length; i += BATCH_SIZE) {
                    if ((container.css('display') === 'block') && !stopResponse) {
                        stopProcess = true;
                    }
    
                    if (stopProcess) {
                        const batch = sourceValues.slice(i, i + BATCH_SIZE);
                        const promises = batch.map(makeAjaxRequest);
    
                        await Promise.allSettled(promises);
    
                        if (i + BATCH_SIZE < sourceValues.length) {
                            await new Promise(resolve => setTimeout(resolve, DELAY));
                        }
                    } else {
                        break; // Exit the loop if stopProcess is false
                    }
                }
    
                if (translatedResponse.some(Boolean)) {
                    container.find(".atlt_save_strings").prop("disabled", false);
                    container.find(".atlt_stats").fadeIn("slow");
                    container.find(".atlt_translate_progress").fadeOut("slow");
                    container.find('#geminiAI_translate_button').prop('disabled', true).css({
                        'background-color': '#cccccc',
                        'cursor': 'not-allowed',
                        'opacity': '1'
                    });
    
                    const message = totalTranslatedCount < totalSourceCount
                        ? `Wahooo! You have saved your valuable time by using auto-translation. You have translated <strong class="totalChars">${totalTranslatedCount}</strong> Strings Out of <strong class="totalChars">${totalSourceCount}</strong> Strings using <strong><a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">Loco Automatic Translate Addon</a></strong>`
                        : `Wahooo! You have saved your valuable time via auto translating <strong class="totalChars">${totalTranslatedCount}</strong> Strings using <strong><a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">Loco Automatic Translate Addon</a></strong>`;
    
                    container.find('.atlt_stats').html(message);
                } else {
                    container.find(".atlt_translate_progress").fadeOut("slow");
                }
    
            } catch (error) {
                console.error('An error occurred during the AJAX processing:', error);
                container.find(".atlt_translate_progress").fadeOut("slow");
            }
        }
    
        processChunksInBatches().catch(error => {
            console.error('An error occurred during the AJAX processing:', error);
            container.find(".atlt_translate_progress").fadeOut("slow");
        });
    
        container.find(".geminiAI-widget-header .close").on("click", function () {
            stopProcess = false;
        });
    
        container.find('.close-button').on("click", function () {
            container.find(".atlt_translate_limitexceed").fadeOut("slow");
        });
    }

    
    // Yandex click handler
    function openYandexTranslateModel(locale) {
        const defaultcode = locale.lang || null;
        let defaultlang = '';

        const langMapping = {
            'bel': 'be',
            'he': 'iw',
            'snd': 'sd',
            'jv': 'jv',
            'nb': 'no',
            'nn': 'no'
            // Add more cases as needed
        };

        defaultlang = langMapping[defaultcode] || defaultcode;
        let modelContainer = $('div#yandex-widget-model.yandex-widget-container');

        modelContainer.find(".atlt_actions > .atlt_save_strings").prop("disabled", true);
        modelContainer.find(".atlt_stats").hide();
        localStorage.setItem("lang", defaultlang);

        const supportedLanguages = ['af', 'jv', 'no', 'am', 'ar', 'az', 'ba', 'be', 'bg', 'bn', 'bs', 'ca', 'ceb', 'cs', 'cy', 'da', 'de', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gd', 'gl', 'gu', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg', 'mhr', 'mi', 'mk', 'ml', 'mn', 'mr', 'mrj', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'pa', 'pap', 'pl', 'pt', 'ro', 'ru', 'si', 'sk', 'sl', 'sq', 'sr', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'tl', 'tr', 'tt', 'udm', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'zh'];

        if (!supportedLanguages.includes(defaultlang)) {
            $("#atlt-dialog").dialog("close");
            modelContainer.find(".notice-container")
                .addClass('notice inline notice-warning')
                .html("Yandex Automatic Translator Does not support this language.");
            modelContainer.find(".atlt_string_container, .choose-lang, .atlt_save_strings, #ytWidget, .translator-widget, .notice-info, .is-dismissible").hide();
            modelContainer.fadeIn("slow");
        } else {
            $("#atlt-dialog").dialog("close");
            modelContainer.find('.notice, .inline, .notice-info, .is-dismissible').show();
            modelContainer.fadeIn("slow");
        }


    }

    function openGoogleTranslateModel(locale) {
        var defaultcode = locale.lang ? locale.lang : null;
        switch (defaultcode) {
            case 'bel':
                defaultlang = 'be';
                break;
            case 'he':
                defaultlang = 'iw';
                break;
            case 'snd':
                defaultlang = 'sd';
                break;
            case 'jv':
                defaultlang = 'jw';
                break;
            case 'nb':
                defaultlang = 'no';
                break;

            case 'nn':
                defaultlang = 'no';
                break;
            default:
                defaultlang = defaultcode;
                break;
        }
        var arr = ['en', 'zh', 'no', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'nl', 'eo', 'et', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'ko', 'ku', 'ky', 'lo', 'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne', 'no', 'or', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'tr', 'tk', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'];

        let modelContainer = $('div#google-widget-model.google-widget-container');
        modelContainer.find(".atlt_actions > .atlt_save_strings").prop("disabled", true);
        modelContainer.find(".atlt_stats").hide();
        if (arr.includes(defaultlang)) {
            $("#atlt-dialog").dialog("close");
            modelContainer.fadeIn("slow");
            modelContainer.find('.notice, .inline, .notice-info, .is-dismissible').show();
            gTranslateWidget();
        } else {
            $("#atlt-dialog").dialog("close");
            modelContainer.find(".notice-container")
                .addClass('notice inline notice-warning')
                .html("Google Automatic Translator Does not support this language.");
            modelContainer.find(".atlt_string_container, .choose-lang, .atlt_save_strings, .translator-widget, .notice-info, .is-dismissible").hide();
            modelContainer.fadeIn("slow");
        }
        if(translationPerformed){
            $("#google-widget-model").find(".atlt_save_strings").prop("disabled", false);
        }
    }


    function gTranslateWidgetOnChange() {
        translationPerformed = true;
        var container = $("#google-widget-model");
        var stringContainer = container.find('.atlt_string_container');

        stringContainer.scrollTop(0);
        var scrollHeight = stringContainer[0].scrollHeight;
        var scrollSpeed = Math.min(10000, scrollHeight);

        if (scrollHeight !== undefined && scrollHeight > 100) {
            container.find(".atlt_translate_progress").fadeIn("slow");

            setTimeout(() => {
                stringContainer.animate({
                    scrollTop: scrollHeight + 2000
                }, scrollSpeed * 2, 'linear');
            }, 2000);

            stringContainer.on('scroll', function () {
                var isScrolledToBottom = ($(this).scrollTop() + $(this).innerHeight() + 50 >= $(this)[0].scrollHeight);

                if (isScrolledToBottom) {
                    onCompleteTranslation(container);
                }
            });

            if (stringContainer.innerHeight() + 10 >= scrollHeight) {
                setTimeout(() => {
                    onCompleteTranslation(container);
                }, 1500);
            }
        } else {
            setTimeout(() => {
                onCompleteTranslation(container);
            }, 2000);
        }
    }

    function onCompleteTranslation(container) {
        if(translationPerformed){
        container.find(".atlt_save_strings").prop("disabled", false);
        container.find(".atlt_stats").fadeIn("slow");
        container.find(".atlt_translate_progress").fadeOut("slow");
        container.find(".atlt_string_container").stop();
        $('body').css('top', '0');
        }
    }

    function openDeepLTranslateModel(locale) {
      var defaultcode = locale.lang ? locale.lang : null;
    //   console.log(defaultcode);
      var domainName = locoConf.conf.project.domain;
      var arr = ['en', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'pt-br', 'ru', 'ja', 'zh', 'de', 'ro', 'lt', 'lv', 'bg', 'cs', 'da', 'et', 'fi', 'el', 'hu', 'sk', 'sl', 'sv', 'nb', 'id', 'ko', 'tr', 'uk'];
      let modelContainer = $("div#deepl-widget-model.deepl-widget-container");
      modelContainer
        .find(".atlt_actions > .atlt_save_strings")
        .prop("disabled", true);
        $("#deepl_upload_strings_btn").prop("disabled", false);
        $("#download_deepl_doc").prop("disabled", false);
      modelContainer.find(".atlt_stats").hide();
      if (arr.includes(defaultcode)) {
        var plainStrArr = filterRawObject(allStrings, "plain");
        if (plainStrArr.length > 0) {
          printStringsInPopup(plainStrArr, (type = "deepl"));
          $("#download_deepl_doc").data("domain-name", domainName);
          modelContainer.find('.notice, .inline, .notice-info, .is-dismissible').show();
        } else {
          $(".notice-container")
            .addClass("notice inline notice-warning")
            .html("There is no plain string available for translations.");
          $(".atlt_string_container, .choose-lang, .atlt_save_strings, .deepl_steps, .notice-info, .is-dismissible").hide();
        }
        $("#atlt-dialog").dialog("close");
        modelContainer.fadeIn("slow");
      } else {
        $("#atlt-dialog").dialog("close");
        modelContainer
          .find(".notice-container")
          .addClass("notice inline notice-warning")
          .html("Deepl Translator does not support this language");
        modelContainer
          .find(
            ".atlt_string_container, .choose-lang, .atlt_save_strings, .deepl_steps, .notice-info, .is-dismissible"
          )
          .hide();
        modelContainer.fadeIn("slow");
      }
      lblError.innerHTML = "";
      $("#deepl-open-file").val("");
      $("#deepl_upload_strings_btn").removeClass("button-primary");
      
      // on click upload string button in deepl model
      $("#deepl_upload_strings_btn").on("click", function (event) {
        uploadDeeplFile(domainName, defaultcode, plainStrArr,modelContainer);
      });
    }

    //on change in choose file button in deepl model
    $("#deepl-open-file").on("change", function(){
        if($("#deepl-open-file")[0].files.length > 0){
            $("#deepl_upload_strings_btn").addClass("button-primary"); 
        }else{
            $("#deepl_upload_strings_btn").removeClass("button-primary");
        }
    });
    //This function is used for Download deepl translation file.
    function generateDocFile(thisBtn) {
      var domainName = $(thisBtn).data("domain-name");
      var stringsTxt = "";
      $("#deepl-widget-model .atlt_strings_table tbody tr").each(function (index) {
        var string = $(this).find("td.source").text();
        stringsTxt += "™" + string;
      });
      const columnTitles = stringsTxt.split(/\™/g);
      const doc = new docx.Document();
      const tableRow = new docx.Table({
        rows: columnTitles.map((title) => {
          return new docx.TableRow({
            children: [
              new docx.TableCell({
                children: [new docx.Paragraph(title + " " + "\n\n\t\n")],
              }),
            ],
          });
        }),
      });
      doc.addSection({
        children: [tableRow],
      }),
        docx.Packer.toBlob(doc).then((blob) => {
          saveAs(blob, `${domainName}-strings.docx`);

          $(thisBtn).prop("disabled", true);
        });
    }

    //This function is used for file validation
    function matchRuleShort(str, rule) {
      var escapeRegex = (str) =>
        str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      return new RegExp(
        `^${rule.split("*").map(escapeRegex).join(".*")}$`
      ).test(str);
    }

    //This function is used for upload deepl translation file.
    function uploadDeeplFile(domainName, defaultcode, plainStrArr,modelContainer) {
      var filename = `${domainName}-strings`;
      var fullPath = $("#deepl-open-file").val();
      var res = defaultcode.toUpperCase();
      var valid_exte = `${filename} ${res}.docx`;
      var valid_ext = valid_exte.toUpperCase();
      jsonObj = plainStrArr;
      var arrInputs = $("#deepl-open-file");
      var allowedFiles = [valid_ext];
      var wild_char = `${domainName}-strings * ${res}.docx`;
      var wild_chars = `${domainName}-strings ${res} *.docx`.toUpperCase();
      var wild_char_ext = wild_char.toUpperCase();
      var wild_chars_ext = wild_chars.toUpperCase();
      if (fullPath) {
        var startIndex =
          fullPath.indexOf("\\") >= 0
            ? fullPath.lastIndexOf("\\")
            : fullPath.lastIndexOf("/");
        var filename = fullPath.substring(startIndex);
        if (filename.indexOf("\\") === 0 || filename.indexOf("/") === 0) {
          file = filename.substring(1);
          filename = file.toUpperCase();
        }
        if (
          matchRuleShort(filename, wild_char_ext) ||
          matchRuleShort(filename, valid_ext) ||
          matchRuleShort(filename, wild_chars_ext)
        ) {
          lblError.innerHTML = "";
          var input = document.getElementById("deepl-open-file");
          var reader = new FileReader();
          reader.onload = function () {
            var zip = new JSZip(reader.result);
            var doc = new window.docxtemplater().loadZip(zip);
            var text = doc.getFullText();
            //check whether the user has translated using deepl free or deepl pro (checking the promotion text)
            if(text.includes("www.DeepL.com/pro"))
            {
                var arr = text.split(/\n\n\t\n/g);
            }else{
                var arr = text.split(/\s{4,}/g);
            }
            var filtered = arr.filter(function (el) {
                return el != " ";
            });
            var demo = "";
            var index = 1;
            for (const key in jsonObj) {
                if (jsonObj.hasOwnProperty(key)) {
                    const element = jsonObj[key];
                    if (element.source != '' && filtered[key] != undefined) {
                        if (key > 2500) {
                            break;
                        }
                            demo += `<tr id="${key}"><td>${index}</td><td class="notranslate source">${element.source}</td>`;
                            demo += `<td class="target" id="output">${filtered.slice(1)[key]}</td></tr>`;
                        }
                    
                    index++;
                }
            }
            modelContainer.find(".atlt_strings_body").html(demo);
          };
          reader.readAsBinaryString(input.files[0]);
          $(".atlt_save_strings").prop("disabled", false);
          modelContainer.find(".atlt_stats").fadeIn("slow");
          $("#deepl_upload_strings_btn").prop("disabled", true);
        } else {
          lblError.innerHTML =
            "Please upload files having extensions: <b>" +
            allowedFiles.join(", ") +
            "</b> only.";
          return false;
        }
      }
    }

    //ChatGPT click handler
    function openChatGPTTranslateModel(locale, projectId, max_size, parts, currentTab, translatedObj, source_String){
        modelContainer = $("div#chatGPT-widget-model.chatGPT-widget-container");
        $("#atlt-dialog").dialog("close");
        $(".modal-footer.chatGPT-widget-footer .atlt_actions").addClass("chatGPT_disable");
        $(".chatGPT_save_cont").addClass("btn-disabled");
        $(".chatGPT_save_close").addClass("btn-disabled");
        modelContainer.fadeIn("slow");
        modelContainer.find(".atlt_string_container, .atlt_save_strings").hide();
        createParts(parts, source_String, max_size, modelContainer);
        modelContainer.find(".chatGptError, .chatGPT_table, .chatGPT_table_close, .clear-button, .preview-button").hide();
        modelContainer.find(`#prevButton, .notice, .inline, .notice-info, .is-dismissible`).show();
        showTab(currentTab);
        $(".chatGPT_step-1").addClass("chatGPT_steps-border");
        $(".chatGPT_step-2, .chatGPT_step-3").removeClass("chatGPT_steps-border");
        updateChatGptButtons(parts,currentTab,modelContainer, projectId);
        var totalParts = parts.length;
        var currentPart = 0;
        var progressbar = $("#chatGPT_progressbar");
        if(totalParts == 1){
            $(".chatGPT_progress").hide();
            $(`#chatGPT_progress-label${currentTab}`).hide();
            $(".preview-button").css({
                "top": "231px"
            });
        }
        progressbar.css("width", 0);
        var ratioText = `(${(currentPart + 1)} / ${totalParts} Parts)`;
        $(`#chatGPT_progress-label${currentTab}`).text(ratioText);
        $("#prevButton").on("click", function () {
            if (currentTab > 0) {
                var errorContainer = $(`#chatGptError${currentTab}`);
                currentTab--;
                updateChatGptButtons(parts,currentTab,modelContainer, projectId);
                showTab(currentTab);
                $(`#chatGPT_table_close${currentTab}`).hide();
                $(`#table${currentTab}`).hide();
                $(`#Part${currentTab}`).show();
                $(`#chatGPT_steps${currentTab}`).show();
                if (errorContainer) {
                    // Hide the error for the current tab
                    $(".chatGptError, .clear-button, .preview-button").hide();
                    $("textarea").val("");
                }
                if (currentPart == 0){
                    return;
                }
                currentPart--;
                progressbar.css("width", Math.round(100 * currentPart / totalParts) + "%");
                var ratioText = `(${(currentPart + 1)} / ${totalParts} Parts)`;
                $(`#chatGPT_progress-label${currentTab}`).text(ratioText);
                $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass("chatGPT_disable");
                $(".chatGPT_save_cont").removeClass("btn-disabled");
                $(".chatGPT_save_close").removeClass("btn-disabled");
                $('.chatGPT_step-1, .chatGPT_step-2, .chatGPT_step-3').removeClass('chatGPT_steps-border');
            }
        });

        //   save the translation in localstorage and go to next page
        $(".chatGPT_save_cont:first").on("click", function () {
            $(".modal-footer.chatGPT-widget-footer .atlt_actions").addClass("chatGPT_disable");
            $(`#prevButton`).show();
            $(".chatGPT_save_cont").addClass("btn-disabled");
            $(".chatGPT_save_close").addClass("btn-disabled");
            const savedDataJSON = localStorage.getItem(`${projectId}-part${currentTab + 1}`);
            if (savedDataJSON) {
                if (currentTab < parts.length - 1) {
                    var errorContainer = $(`#chatGptError${currentTab}`);
                    currentTab++;
                    updateChatGptButtons(parts,currentTab, modelContainer, projectId);
                    showTab(currentTab);
                    if (errorContainer) {
                        // Hide the error for the current tab
                        $(".chatGptError, .clear-button, .preview-button").hide();
                        $("textarea").val("");
                    }
                    //Update Progress Bar
                    if (currentPart >= totalParts){ 
                        return;
                    }
                    currentPart++;
                    progressbar.css("width", Math.round(100 * currentPart / totalParts) + "%");
                    var ratioText = `(${(currentPart + 1)} / ${totalParts} Parts)`;
                    $(`#chatGPT_progress-label${currentTab}`).text(ratioText);
                    if(localStorage.getItem(`${projectId}-part${currentTab + 1}`)){
                        $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass("chatGPT_disable");
                        $(".chatGPT_save_cont").removeClass("btn-disabled");
                        $(".chatGPT_save_close").removeClass("btn-disabled");
                        $(".chatGPT_step-1, .chatGPT_step-2, .chatGPT_step-3").removeClass("chatGPT_steps-border");
                    }else{
                        $(".chatGPT_step-2, .chatGPT_step-3").removeClass("chatGPT_steps-border");
                        $(".chatGPT_step-1").addClass("chatGPT_steps-border");
                    }
                }
           
            } 
        });

        //   save the translation
        $(".chatGPT_save_close").on("click", function () {
            const savedDataJSON = localStorage.getItem(`${projectId}-part${currentTab + 1}`);
            if (savedDataJSON) {
                const mergedData = mergeLocalStorageData(parts, translatedObj);
                saveTranslatedStrings(mergedData, projectId);
                $("#chatGPT-widget-model").fadeOut("slow", function () {
                    for (let j = 0; j < parts.length; j++) {
                        localStorage.removeItem(`${projectId}-part${j + 1}`);
                        if ($(".container").length > 0) {
                            // If it exists, remove it
                            $(".container").remove();
                        }
                    }
                });
                $("html").addClass("merge-translations");
                updateLocoModel();
            }
        });

        // if there is data in localstorage then table is created using stored data
        createTableFromLocalStorage(parts, projectId);
        actionsPerPart(parts, locale, projectId, translatedObj,modelContainer);
    }
    
    function createParts(parts, source_String, max_size, modelContainer) {
        parts.length = 0;
        const tabContainer = document.getElementById("tabContainer");
        const sourceKeys = Object.keys(source_String);
        const maxTokensPerPart = 500;
      
        let part = {};
        let currentPartTokens = 0;
        let currentPartStrings = 0;
      
        for (const key of sourceKeys) {
          const keyTokens = countTokens(source_String[key]);
      
          // Check if adding the current key will exceed the token limit
          if (currentPartTokens + keyTokens > maxTokensPerPart) {
            
            // If the token limit is exceeded, create a new part
            parts.push(part);
            const tabContent = createPartsContent(parts.length - 1, modelContainer);
            tabContainer.appendChild(tabContent);
      
            // Reset the current part and counters
            part = {};
            currentPartTokens = 0;
            currentPartStrings = 0;
          }
      
          // Check if adding the current key will exceed the string limit
          if (currentPartStrings >= max_size) {
            // If the string limit is exceeded, create a new part
            parts.push(part);
            const tabContent = createPartsContent(parts.length - 1, modelContainer);
            tabContainer.appendChild(tabContent);
            
            // Reset the current part and counters
            part = {};
            currentPartTokens = 0;
            currentPartStrings = 0;
          }
      
          // Add the key to the current part
          part[key] = source_String[key];
          currentPartTokens += keyTokens;
          currentPartStrings++;
      
          // If token limit is reached within the current part, create a new part
          if (currentPartTokens >= maxTokensPerPart) {
            parts.push(part);
            const tabContent = createPartsContent(parts.length - 1, modelContainer);
            tabContainer.appendChild(tabContent);
      
            // Reset the current part and counters
            part = {};
            currentPartTokens = 0;
            currentPartStrings = 0;
          }
          $('.chatGptError').hide();
        }
      
        // Add any remaining keys to the last part
        if (Object.keys(part).length > 0) {
          parts.push(part);
          const tabContent = createPartsContent(parts.length - 1, modelContainer);
          tabContainer.appendChild(tabContent);
        }
        return tabContainer;
    }

    function countTokens(inputString) {
        return inputString.split(' ').length;
    }

    function createPartsContent(partIndex, modelContainer) {
        const containerDiv = document.createElement("div");
        containerDiv.className = "container";
        containerDiv.innerHTML = `
        <input type="hidden" data-nextIndexVal="${partIndex}" id= "input${partIndex}">
        <h1 style ="text-align: center;" id="Part${partIndex}">Part ${partIndex + 1} <span style= "font-size: large;" id="chatGPT_progress-label${partIndex}"></span></h1>
        <div class="formBody">
        <input type="hidden" id="translate${partIndex}">
    
        <table class="chatGPT_steps" id="chatGPT_steps${partIndex}">
            <tr>
            <td class= "chatGPT_step-1">
              <h2>Step 1</h2>
              <p>Click on the copy button to copy the strings</p>
              <button class="button button-primary copy-button" id="copyButton${partIndex}" type="button" name="copy">Copy</button>
            </td>
            <td class= "chatGPT_step-2">
              <h2>Step 2</h2>
              <p>Visit <a class = "chatGPT_step-2-anchor" href="https://chat.openai.com/" target="_blank">https://chat.openai.com/</a><br/>and paste strings in ChatGPT<br/>for translation.</p>
            </td>
            </tr>
            <tr>
            <td colspan="2" class= "chatGPT_step-3">
              <h2>Step 3</h2>
              <p>Now copy the translated string that ChatGPT gives you and paste it into the below section <span style="font-size: smaller;">(must be in JSON Format) <button type="button" class="preview-button button button-primary" id="preview${partIndex}">Preview</button></span></p>
              <div style="position: relative;">
                        <textarea id="output${partIndex}" class="output-box" rows="5" cols="130" style="width: 100%;" placeholder="Add translated strings here..."></textarea>
                        <button type="button" class="clear-button button button-primary" id="clearButton${partIndex}">Clear</button>
                </div>
            </td>
            </tr>
            </table>
            </div>
            <button type= "button" class="button button-primary chatGPT_table_close" id = "chatGPT_table_close${partIndex}" style="float:right; font-size:14px; margin: 10px 0;">Close</button>
            <div id="table${partIndex}" class = "chatGPT_table"></div>`;
        return containerDiv;
    }

    function showTab(tabIndex) {
        // Hide all tabs and show the selected tab
        $(".container").hide();
        $(`.container:eq(${tabIndex})`).show();
    }
    
    function errorHandling(errorMsg, currentTab){
        $(".chatGptError").attr("id",`chatGptError${currentTab}`);
        $(`#chatGptError${currentTab}`).html(errorMsg);
    }

    function updateChatGptButtons(parts, currentTab, modelContainer, projectId) {
      if (parts.length <= 1) {
        $("#prevButton").prop("disabled", true);
        $(".chatGPT_save_cont").prop("disabled", true);
      } else if (currentTab === 0) {
        $("#prevButton").prop("disabled", true);
        $(".chatGPT_save_cont").prop("disabled", false);
      } else if (currentTab === parts.length - 1) {
        $("#prevButton").prop("disabled", false);
        $(".chatGPT_save_cont").prop("disabled", true);
      } else {
        $("#prevButton").prop("disabled", false);
        $(".chatGPT_save_cont").prop("disabled", false);
      }
    }

    function createTableFromLocalStorage(parts, projectId) {
        parts.forEach((part, i) => {
          const savedDataJSON = localStorage.getItem(`${projectId}-part${i + 1}`);
          if (savedDataJSON) {
            const savedData = JSON.parse(savedDataJSON);
            // Create a table to display saved data
            let savedDataHTML = `<table class="table">`;
            savedDataHTML +=
              '<tr><th scope="col">S. No.</th><th scope="col">Source</th><th scope="col">Target</th></tr>';
      
            // Iterate over the saved data and add rows to the table
            Object.keys(savedData).forEach((key, index) => {
              const source = savedData[key].source;
              const target = savedData[key].target;
              const escapeSource = source ? escapeHtml(source) : ''; // Use an empty string if source is missing
              const escapetarget = target ? escapeHtml(target) : ''; // Use an empty string if target is missing
              savedDataHTML += `<tr><td>${key}</td><td class = "source">${escapeSource}</td><td class = "target">${escapetarget}</td></tr>`;
            });
      
            savedDataHTML += "</table>";
      
            // Append the table to the corresponding container
            const tableDiv = document.querySelector(`#table${i}`);
            tableDiv.innerHTML = savedDataHTML;
            $(".chatGPT_step-1").removeClass("chatGPT_steps-border");
            $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass("chatGPT_disable");
            $(".chatGPT_save_cont").removeClass("btn-disabled");
            $(".chatGPT_save_close").removeClass("btn-disabled");
          } else {
            const tableDiv = document.querySelector(`#table${i}`);
            let tableHTML = `<table class="table">`;
            tableHTML +=
              '<tr><th scope="col">S. No.</th><th scope="col">Source</th><th scope="col">Target</th></tr>';
      
            Object.keys(part).forEach((key, index) => {
              const value = part[key];
              const escapeValue = value ? encodeHtmlEntity(value) : '';
              tableHTML += `<tr><td>${key}</td><td class = "source">${escapeValue}</td><td class = "target"></td></tr>`;
            });
      
            tableHTML += "</table>";
            tableDiv.innerHTML = tableHTML;
          }
          
          
        });
      }
      function escapeHtml(html) {
        return html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }

      function createPartsTable(i, textareaValue, projectId) {
        const dataToSave = {};
        // Validate textarea field
        function isValidJSONString(str) {
          try {
            JSON.parse(str);
            return true;
          } catch (error) {
              if (textareaValue.startsWith("You are a helpful assistant that translates and replies with well-formed JSON")) {
                  var errorMsg =
              "Untranslated Strings! *You have pasted the untranslated strings, Please translate them first";
            $(".chatGptError").show();
            errorHandling(errorMsg, i);
            return false;
              }else{
                  var errorMsg =
                  `Invalid JSON Format! *Please enter a valid JSON-formatted string in the textarea. Click <a href="https://locoaddon.com/docs/pro-plugin/ai-translation-issues-and-solutions/" target="_blank">here</a> to validate your JSON`;
              $(".chatGptError").show();
            errorHandling(errorMsg, i);
              }
              
          }
        }
        if(isValidJSONString(textareaValue)){
          const parsedJSON = JSON.parse(textareaValue);
          if (Array.isArray(parsedJSON)) {
              const tableDiv = document.querySelector(`#table${i}`);
            const tableSourceCells = tableDiv.querySelectorAll(".source"); // Get all source cells in the table
            const firstSourceInTable = tableSourceCells[0].textContent;
            if (parsedJSON && parsedJSON[0] && parsedJSON[0][1] && parsedJSON[0][1].source) {
              // console.log(parsedJSON[0]);
              if(firstSourceInTable === parsedJSON[0][1].source){
                  tableDiv.innerHTML = "";
                let resultHtml = `<table class="table">`;
                resultHtml +=
                  '<tr><th scope="col">S. No.</th><th scope="col">Source</th><th scope="col">Target</th></tr>';
                parsedJSON.forEach((obj, index) => {
                  if (typeof obj === "object" && obj !== null) {
                    const key = Object.keys(obj)[0];
                    const { source, target } = obj[key];
                    const escapeSource = source ? escapeHtml(source) : ''; // Use an empty string if source is missing
                    const escapetarget = target ? escapeHtml(target) : ''; // Use an empty string if target is missing
      
                    // Create a table for each array element
                    resultHtml += `<tbody><tr><td>${key}</td><td class="source">${escapeSource}</td><td class="target">${escapetarget}</td></tr></tbody>`;
      
                    // Store the data in the dataToSave object (you can modify this as needed)
                    dataToSave[key] = {
                      source,
                      target,
                    };
                    var errorMsg = "";
                $(".chatGptError").hide();
                errorHandling(errorMsg, i);
                $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass(
                  "chatGPT_disable"
                );
                $(".chatGPT_save_cont").removeClass("btn-disabled");
                $(".chatGPT_save_close").removeClass("btn-disabled");
                  }
                });
                resultHtml += "</table>";
      
                // Append the table to the corresponding container
                tableDiv.innerHTML += resultHtml;
                // Save data in local storage (you can modify this as needed)
                const dataToSaveJSON = JSON.stringify(dataToSave);
                localStorage.setItem(`${projectId}-part${i + 1}`, dataToSaveJSON);
      
                $(".chatGPT_step-1, .chatGPT_step-2, .chatGPT_step-3").removeClass(
                  "chatGPT_steps-border"
                );
                var errorMsg = "";
                $(".chatGptError").hide();
                errorHandling(errorMsg, i);
                $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass(
                  "chatGPT_disable"
                );
                $(".chatGPT_save_cont").removeClass("btn-disabled");
                $(".chatGPT_save_close").removeClass("btn-disabled");
              }else{
                  var errorMsg =
                "Wrong translated strings! *Please enter right strings translation";
              $(".chatGptError").show();
              errorHandling(errorMsg, i);
              return false;
              }
          } 
          else if(parsedJSON && parsedJSON[0] && parsedJSON[0].source){
              // console.log(parsedJSON[0]);
              if(firstSourceInTable === parsedJSON[0].source){
                  tableDiv.innerHTML = "";
                let resultHtml = `<table class="table">`;
                resultHtml +=
                  '<tr><th scope="col">S. No.</th><th scope="col">Source</th><th scope="col">Target</th></tr>';
                parsedJSON.forEach((obj, index) => {
                  if (typeof obj === "object" && obj !== null) {
                    const key = Object.keys(obj)[0];
                    const { source, target } = obj;
                    const escapeSource = source ? escapeHtml(source) : ''; // Use an empty string if source is missing
                    const escapetarget = target ? escapeHtml(target) : ''; // Use an empty string if target is missing
      
                    // Create a table for each array element
                    resultHtml += `<tbody><tr><td>${index + 1}</td><td class="source">${escapeSource}</td><td class="target">${escapetarget}</td></tr></tbody>`;
      
                    // Store the data in the dataToSave object (you can modify this as needed)
                    dataToSave[`${index + 1}`] = {
                      source,
                      target,
                  };
                    var errorMsg = "";
                $(".chatGptError").hide();
                errorHandling(errorMsg, i);
                $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass(
                  "chatGPT_disable"
                );
                $(".chatGPT_save_cont").removeClass("btn-disabled");
                $(".chatGPT_save_close").removeClass("btn-disabled");
                  }
                });
                resultHtml += "</table>";
      
                // Append the table to the corresponding container
                tableDiv.innerHTML += resultHtml;
                // Save data in local storage (you can modify this as needed)
                const dataToSaveJSON = JSON.stringify(dataToSave);
                localStorage.setItem(`${projectId}-part${i + 1}`, dataToSaveJSON);
      
                $(".chatGPT_step-1, .chatGPT_step-2, .chatGPT_step-3").removeClass(
                  "chatGPT_steps-border"
                );
                var errorMsg = "";
                $(".chatGptError").hide();
                errorHandling(errorMsg, i);
                $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass(
                  "chatGPT_disable"
                );
                $(".chatGPT_save_cont").removeClass("btn-disabled");
                $(".chatGPT_save_close").removeClass("btn-disabled");
              }else{
                  var errorMsg =
                "Wrong translated strings! *Please enter right strings translation";
              $(".chatGptError").show();
              errorHandling(errorMsg, i);
              return false;
              }
          }
            
            }
          // Ensure the parsedJSON is an object
          else if (typeof parsedJSON === "object" && !Array.isArray(parsedJSON)) {
             
            const keys = Object.keys(parsedJSON);
            const tableDiv = document.querySelector(`#table${i}`);
            const tableSourceCells = tableDiv.querySelectorAll(".source"); // Get all source cells in the table
            const firstSourceInTable = tableSourceCells[0].textContent;
          //   console.log(parsedJSON[keys[0]]['source']);
            if(firstSourceInTable === parsedJSON[keys[0]]['source']){
              let resultHtml = `<table class="table">`;
              resultHtml +=
              '<tr><th scope="col">S. No.</th><th scope="col">Source</th><th scope="col">Target</th></tr>';
              // Iterate over the keys and values in the parsed JSON
              keys.forEach((key) => {
              const { source, target } = parsedJSON[key];
              const escapeSource = source ? escapeHtml(source) : ''; // Use an empty string if source is missing
              const escapetarget = target ? escapeHtml(target) : ''; // Use an empty string if target is missing
              // Append a row with the key, source, and target
              resultHtml += `<tbody><tr><td>${key}</td><td class="source">${escapeSource}</td><td class="target">${escapetarget}</td></tr></tbody>`;
  
              // Store the data in the dataToSave object
              dataToSave[key] = {
                source,
                target,
              };
            });
  
            resultHtml += "</table>";
  
            // Append the table to the corresponding container
            tableDiv.innerHTML = resultHtml;
  
            // Save data in local storage
            const dataToSaveJSON = JSON.stringify(dataToSave);
            localStorage.setItem(`${projectId}-part${i + 1}`, dataToSaveJSON);
            $(".chatGPT_step-1, .chatGPT_step-2, .chatGPT_step-3").removeClass(
              "chatGPT_steps-border"
            );
            var errorMsg = "";
            $(".chatGptError").hide();
            errorHandling(errorMsg, i);
            $(".modal-footer.chatGPT-widget-footer .atlt_actions").removeClass(
              "chatGPT_disable"
            );
            $(".chatGPT_save_cont").removeClass("btn-disabled");
            $(".chatGPT_save_close").removeClass("btn-disabled");
          }else{
              var errorMsg =
              "Wrong translated strings! *Please enter right strings translation";
              $(".chatGptError").show();
              errorHandling(errorMsg, i);
              return false;
          }
      }else {
          // Handle cases where the JSON format is neither an array nor an object
          var errorMsg = "Invalid JSON Format! *Please enter a valid JSON-formatted strfing in the textarea.";
          $(".chatGptError").show();
          errorHandling(errorMsg, i);
          return false;
        }
        }
      }

    function actionsPerPart(parts, locale, projectId, translatedObj, modelContainer) {
        parts.forEach((part, i) => {
            jsonString = `You are requesting the translation of a JSON array into ${locale.label} language. Please follow the instructions provided below for accurate translation:

            Instruction 1: [% s,% d,% S,% D,% s,% S,% d,% D,%س] These placeholders are special and should not be translated.
            Instruction 2: Avoid repeating translations and skip any strings if necessary. If a string is skipped, maintain its original key.
            Instruction 3: Return the translation in the format of a JSON array with 'source' and 'target' keys. 'Source' should contain the original strings from the given JSON array, while 'target' should include their translations.
            Instruction 4: Use '\\' to escape special characters like " and ' to ensure valid JSON format.
            Instruction 5: Translate the provided JSON array into ${locale.label} language, regardless of whether the values are the same.
            ${JSON.stringify(part)}
            Please ensure that the output follows the format:
            {"key(numeric value)":{"source": "(original strings from the JSON)", "target": "(translations of the strings in ${locale.label} language)"}}`;
          document.getElementById(`translate${i}`).value = jsonString;
      
          const copyButton = document.getElementById(`copyButton${i}`);
          copyButton.addEventListener("click", function () {
            $(".chatGPT_step-1, .chatGPT_step-3, .chatGPT_save_cont").removeClass("chatGPT_steps-border");
            $(".chatGPT_step-2").addClass("chatGPT_steps-border");
            const inputField = document.getElementById(`translate${i}`);
            const textArea = document.createElement("textarea");
            textArea.value = inputField.value;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            copyButton.innerText = "Copied";
            setTimeout(() => {
            window.open('https://chat.openai.com', '_blank');
            }, 800);
            setTimeout(function () {
                $(".chatGPT_step-2").removeClass("chatGPT_steps-border");
                $(".chatGPT_step-3").addClass("chatGPT_steps-border");
            }, 1000);
            setTimeout(() => {
              copyButton.innerText = "Copy";
            }, 6000);
          });
      
          const textarea = document.getElementById(`output${i}`);
          textarea.addEventListener("input", function (event) {
            setTimeout(function () {
              const textareaValue = textarea.value;
              if (textareaValue !== "") {
                createPartsTable(i, textareaValue, projectId);
                $(`#clearButton${i}`).show();
                $(`#preview${i}`).show();
              }
              if(textareaValue == ""){
                var errorMsg = "";
          $(".chatGptError").hide();
          $(`#clearButton${i}`).hide();
          $(`#preview${i}`).hide();
          errorHandling(errorMsg, i);
              }
            }, 100);
          });

          //Clear textarea
          const clearTextareaButton = document.getElementById(`clearButton${i}`);
          clearTextareaButton.addEventListener("click", function () {
            $(`#output${i}`).val("");
            $(`#clearButton${i}`).hide();
            $(`#preview${i}`).hide();
            var errorMsg = "";
          $(".chatGptError").hide();
          errorHandling(errorMsg, i);
          });

          //View table of part
          const previewButton = document.getElementById(`preview${i}`);
          previewButton.addEventListener("click", function () {
            $(`#Part${i}`).hide();
            $(`#chatGPT_steps${i}`).hide();
            $(`#prevButton, .notice, .inline, .notice-info, .is-dismissible`).hide();
            $(`#chatGPT_table_close${i}`).show();
            $(`#table${i}`).show();
          });

          // Close preview of table
          const chatGPTTableClose = document.getElementById(`chatGPT_table_close${i}`);
          chatGPTTableClose.addEventListener("click" ,function(){
            $(`#Part${i}`).show();
            $(`#chatGPT_steps${i}`).show();
            $(`#prevButton, .notice, .inline, .notice-info, .is-dismissible`).show();
            $(`#chatGPT_table_close${i}`).hide();
            $(`#table${i}`).hide();
          });

          //Check if there's data in local storage for last part
          setInterval(function(){
            const savedDataJSON = localStorage.getItem(`${projectId}-part${parts.length}`);
            if($(".chatGptError").is(":empty") && savedDataJSON){
            modelContainer.find(".atlt_stats").fadeIn("slow");
            }else{
                modelContainer.find(".atlt_stats").hide();
            }
          }, 200); //check every 200ms
        });
    }

    function mergeLocalStorageData(parts, translatedObj) {
        const rpl = {
            '"% s"': '"%s"',
            '"% d"': '"%d"',
            '"% S"': '"%s"',
            '"% D"': '"%d"',
            '% s': ' %s ',
            '% S': ' %s ',
            '% d': ' %d ',
            '% D': ' %d ',
            '٪ s': ' %s ',
            '٪ S': ' %s ',
            '٪ d': ' %d ',
            '٪ D': ' %d ',
            '٪ س': ' %s ',
            '%S': ' %s ', 
            '%D': ' %d ', 
            '% %':'%%'   
        };

        const regex = /(\%\s*\d+\s*\$?\s*[a-z0-9])/gi;

        parts.forEach((part, i) => {
          $(`#table${i} tbody tr`).slice(1).each(function (index) {
            var index = $(this).find("td.source").text();
            var target = $(this).find("td.target").text();
            var source = $(this).find("td.source").text();

            let improvedTarget;
            let improvedSource;          
            if((!(target=='')) && (!(source==''))){
                const improvedTargetrpl = strtr(target, rpl);
                const improvedSourcerpl = strtr(source, rpl);

                improvedTarget = improvedTargetrpl.replace(regex, function(match) {
                    return match.replace(/\s/g, '').toLowerCase();
                });

                improvedSource = improvedSourcerpl.replace(regex, function(match) {
                    return match.replace(/\s/g, '').toLowerCase();
            });
            }
            if((!(improvedTarget==undefined))&&(!(improvedSource==undefined))){

                  translatedObj.push({
                    source: improvedSource,
                    target: improvedTarget,
                     });      
            }
          });
        });
        return translatedObj;
      }

    // parse all translated strings and pass to save function
    function onSaveClick() {
        let translatedObj = [];
        let type = this.getAttribute("data-type");
        const rpl = {
            '"% s"': '"%s"',
            '"% d"': '"%d"',
            '"% S"': '"%s"',
            '"% D"': '"%d"',
            '% s': ' %s ',
            '% S': ' %s ',
            '% d': ' %d ',
            '% D': ' %d ',
            '٪ s': ' %s ',
            '٪ S': ' %s ',
            '٪ d': ' %d ',
            '٪ D': ' %d ',
            '٪ س': ' %s ',
            '%S': ' %s ', 
            '%D': ' %d ', 
            '% %':'%%'    
        };

        const regex = /(\%\s*\d+\s*\$?\s*[a-z0-9])/gi;

        $("." + type + "-widget-body").find(".atlt_strings_table tbody tr").each(function () {
            const source = $(this).find("td.source").text();
            const target = $(this).find("td.target").text();

            const improvedTargetrpl = strtr(target, rpl);
            const improvedSourcerpl = strtr(source, rpl);

            const improvedTarget = improvedTargetrpl.replace(regex, function(match) {
                return match.replace(/\s/g, '').toLowerCase();
            });

            const improvedSource = improvedSourcerpl.replace(regex, function(match) {
                return match.replace(/\s/g, '').toLowerCase();
            });

            translatedObj.push({
                "source": improvedSource,
                "target": improvedTarget
            });
        });

        var projectId = $(this).parents(".atlt_custom_model").find("#project_id").val();

        //  Save Translated Strings
        saveTranslatedStrings(translatedObj, projectId);
        $(".atlt_custom_model").fadeOut("slow");
        $("html").addClass("merge-translations");
        updateLocoModel();
    }

    // update Loco Model after click on merge translation button
    function updateLocoModel() {
        var checkModal = setInterval(function () {
            var locoModel = $('.loco-modal');
            var locoModelApisBatch = $('.loco-modal #loco-apis-batch');
            if (locoModel.length && // model exists check
                locoModel.attr("style").indexOf("none") <= -1 && // has not display none
                locoModel.find('#loco-job-progress').length // element loaded 
            ) {
                $("html").removeClass("merge-translations");
                locoModelApisBatch.find("a.icon-help, a.icon-group, #loco-job-progress").hide();
                locoModelApisBatch.find("select#auto-api").hide();
                var currentState = $("select#auto-api option[value='loco_auto']").prop("selected", "selected");
                locoModelApisBatch.find("select#auto-api").val(currentState.val());
                locoModel.find(".ui-dialog-titlebar .ui-dialog-title").html("Step 3 - Add Translations into Editor and Save");
                locoModelApisBatch.find("button.button-primary span").html("Start Adding Process");
                locoModelApisBatch.find("button.button-primary").on("click", function () {
                    $(this).find('span').html("Adding...");
                });
                locoModel.addClass("addtranslations");
                $('.noapiadded').remove();
                locoModelApisBatch.find("form").show();
                locoModelApisBatch.removeClass("loco-alert");
                clearInterval(checkModal);
            }
        }, 200); // check every 200ms
    }
    function openTranslationProviderModel(e) {
        if (e.originalEvent !== undefined) {
            var checkModal = setInterval(function () {
                var locoModal = $(".loco-modal");
                var locoBatch = locoModal.find("#loco-apis-batch");
                var locoTitle = locoModal.find(".ui-dialog-titlebar .ui-dialog-title");

                if (locoBatch.length && !locoModal.is(":hidden")) {
                    locoModal.removeClass("addtranslations");
                    locoBatch.find("select#auto-api").show();
                    locoBatch.find("a.icon-help, a.icon-group").show();
                    locoBatch.find("#loco-job-progress").show();
                    locoTitle.html("Auto-translate this file");
                    locoBatch.find("button.button-primary span").html("Translate");

                    var opt = locoBatch.find("select#auto-api option").length;

                    if (opt === 1) {
                        locoBatch.find(".noapiadded").remove();
                        locoBatch.removeClass("loco-alert");
                        locoBatch.find("form").hide();
                        locoBatch.addClass("loco-alert");
                        locoTitle.html("No translation APIs configured");
                        locoBatch.append(`<div class='noapiadded'>
                            <p>Add automatic translation services in the plugin settings.<br>or<br>Use <strong>Auto Translate</strong> addon button.</p>
                            <nav>
                                <a href='http://locotranslate.local/wp-admin/admin.php?page=loco-config&amp;action=apis' class='button button-link has-icon icon-cog'>Settings</a>
                                <a href='https://localise.biz/wordpress/plugin/manual/providers' class='button button-link has-icon icon-help' target='_blank'>Help</a>
                                <a href='https://localise.biz/wordpress/translation?l=de-DE' class='button button-link has-icon icon-group' target='_blank'>Need a human?</a>
                            </nav>
                        </div>`);
                    }
                    clearInterval(checkModal);
                }
            }, 100); // check every 100ms
        }
    }
    // filter string based upon type
    function filterRawObject(rawArray, filterType) {
        return rawArray.filter((item) => {
            if (item.source && !item.target) {
                if (ValidURL(item.source) || isHTML(item.source) || isSpecialChars(item.source) || isEmoji(item.source) || item.source.includes('#')) {
                    return false;
                } else if (isPlacehodersChars(item.source)) {
                    return true;
                } else {
                    return true;
                }
            }
            return false;
        });
    }
    // detect String contain URL
    function ValidURL(str) {
        var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        return pattern.test(str);
    }
    // detect Valid HTML in string
    function isHTML(str) {
        var rgex = /<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i;
        return rgex.test(str);
    }
    //  check special chars in string
    function isSpecialChars(str) {
        var rgex = /[@^{}|<>]/g;
        return rgex.test(str);
    }
    //  check Emoji chars in string
    function isEmoji(str) {
        var ranges = [
            '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])' // U+1F680 to U+1F6FF
        ];
        return str.match(ranges.join('|'));
    }
    // allowed special chars in plain text
    function isPlacehodersChars(str) {
        var rgex = /%s|%d/g;
        return rgex.test(str);
    }
    // replace placeholders in strings
    function strtr(s, p, r) {
        return !!s && {
            2: function () {
                for (var i in p) {
                    s = strtr(s, i, p[i]);
                }
                return s;
            },
            3: function () {
                return s.replace(RegExp(p, 'g'), r);
            },
            0: function () {
                return;
            }
        }[arguments.length]();
    }

    // Save translated strings in the cache using ajax requests in parts.
    function saveTranslatedStrings(translatedStrings, projectId) {
        // Check if translatedStrings is not empty and has data
        if (translatedStrings && translatedStrings.length > 0) {
            // Define the batch size for ajax requests
            const batchSize = 2500;

            // Iterate over the translatedStrings in batches
            for (let i = 0; i < translatedStrings.length; i += batchSize) {
                // Extract the current batch
                const batch = translatedStrings.slice(i, i + batchSize);
                // Determine the part based on the batch position
                const part = `-part-${Math.ceil(i / batchSize)}`;
                // Send ajax request for the current batch
                sendBatchRequest(batch, projectId, part);

            }
        }
    }

    // send ajax request and save data.
    function sendBatchRequest(stringData, projectId, part) {
        const data = {
            'action': 'save_all_translations',
            'data': JSON.stringify(stringData),
            'part': part,
            'project-id': projectId,
            'wpnonce': nonce
        };
        $.ajax({
            url: ajaxUrl,
            method: 'POST',
            data: data,
            dataType: 'json', // Response data type
            success: function (response) {
                // Handle success
                $('#loco-editor nav button[data-loco="auto"]').trigger("click");
            },
            error: function (xhr, status, error) {
                // Handle error
                console.error(error);
            }
        });
    }

    // integrates auto traslator button in editor
    function addAutoTranslationBtn() {
        // check if button already exists inside translation editor
        const existingBtn = $("#loco-editor nav").find("#cool-auto-translate-btn");
        if (existingBtn.length > 0) {
            existingBtn.remove();
        }
        const locoActions = $("#loco-editor nav").find("#loco-actions");
        const autoTranslateBtn = $('<fieldset><button id="cool-auto-translate-btn" class="button has-icon icon-translate">Auto Translate</button></fieldset>');
        // append custom created button.
        locoActions.append(autoTranslateBtn);
    }
    // open settings model on auto translate button click
    function openSettingsModel() {
        $("#atlt-dialog").dialog({
            dialogClass: rtlClass,
            resizable: false,
            height: "auto",
            width: 400,
            modal: true,
            buttons: {
                Cancel: function () {
                    $(this).dialog("close");
                }
            }
        });
    }

    //String Translate Model
    // Get all elements with the class "atlt_custom_model"
    var modals = document.querySelectorAll(".atlt_custom_model");
    // When the user clicks anywhere outside of any modal, close it
    $(window).click(function (event) {
        for (var i = 0; i < modals.length; i++) {
            var modal = modals[i];
            if ($(event.target).hasClass("atlt_custom_model") && event.target === modal) {
                modal.style.display = "none";
                if ($(".container").length > 0) {
                    // If it exists, remove it
                    if ($(".chatGPT_steps-border").length > 0) {
                        $(".chatGPT_steps-border").removeClass("chatGPT_steps-border");
                    }
                    $(".container").remove();
                }
            }
        }
    });

    // Get the <span> element that closes the modal
    $(".atlt_custom_model").find(".close").on("click", function () {
        if ($(".container").length > 0) {
            // If it exists, remove it
            if ($(".chatGPT_steps-border").length > 0) {
                $(".chatGPT_steps-border").removeClass("chatGPT_steps-border");
            }
            $(".container").remove();
        }
        $(".atlt_custom_model").fadeOut("slow");
       
    });

    function encodeHtmlEntity(str) {
        var buf = [];
        for (var i = str.length - 1; i >= 0; i--) {
            buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
        }
        return buf.join('');
    }

    // get object and append inside the popup
    function printStringsInPopup(jsonObj, type) {
        let html = '';
        let totalTChars = 0;
        let index = 1;
        let custom_attr = type === "yandex" ? 'translate="yes"' : '';
        if (jsonObj) {
            for (const key in jsonObj) {
                if (jsonObj.hasOwnProperty(key)) {
                    const element = jsonObj[key];
                    const sourceText = element.source.trim();

                    if (sourceText !== '') {
                        if ((type == "yandex") || type == "google" || type == "deepl" || type == "geminiAI") {
                            html += `<tr id="${key}"><td>${index}</td><td class="notranslate source">${encodeHtmlEntity(sourceText)}</td>`;

                            if (type == "yandex" || type == "google") {

                                html += `<td   ${custom_attr}  class="target translate">${sourceText}</td></tr>`;

                            }else {
                                html += '<td class="target translate"></td></tr>';
                            }

                            index++;
                            totalTChars += sourceText.length;
                        }
                    }
                }
            }

            $(".atlt_stats").each(function () {
                $(this).find(".totalChars").html(totalTChars);
            });
        }

        $("#" + type + '-widget-model').find(".atlt_strings_table > tbody.atlt_strings_body").html(html);

    }

    function settingsModel() {
        const ytPreviewImg = ATLT_URL + 'assets/images/' + extradata['yt_preview'];
        const gtPreviewImg = ATLT_URL + 'assets/images/' + extradata['gt_preview'];
        const dplPreviewImg = ATLT_URL + 'assets/images/' + extradata['dpl_preview'];
        const chatGPTPreviewImg = ATLT_URL + 'assets/images/' + extradata['chatGPT_preview'];
        const geminiAIPreviewImg = ATLT_URL + 'assets/images/' + extradata['geminiAI_preview'];
        const modelHTML = `
            <div id="atlt-dialog" title="Step 1 - Select Translation Provider" style="display:none;">
                <div class="atlt-settings">
                    <strong class="atlt-heading">Translate Using Yandex Page Translate Widget</strong>
                    <div class="inputGroup">
                        <button id="atlt_yandex_translate_btn" class="notranslate button button-primary">Yandex Translate</button>
                        <br/><a href="https://translate.yandex.com/" target="_blank"><img class="pro-features-img" src="${ytPreviewImg}" alt="powered by Yandex Translate Widget"></a>
                    </div>
                    <hr/>
    
                    <strong class="atlt-heading">Translate Using Google Page Translate Widget</strong>
                    <div class="inputGroup">
                        <button id="atlt_google_translate_btn" class="notranslate button button-primary">Google Translate</button>
                        <br/><a href="https://translate.google.com/" target="_blank"><img class="pro-features-img" src="${gtPreviewImg}" alt="powered by Google Translate Widget"></a>
                    </div>
                    <hr/>
    
                    <strong class="atlt-heading">Translate Using Deepl Doc Translator</strong>
                    <div class="inputGroup">
                        <button id="atlt_deepl_btn" class="notranslate button button-primary">DeepL Translate</button>
                        <br/><a href="https://www.deepl.com/en/translator" target="_blank"><img class="pro-features-img" src="${dplPreviewImg}" alt="powered by DeepL Translate"></a>
                    </div>
                    <hr/>

                    <strong class="atlt-heading">Translate Using ChatGPT</strong>
                    <div class="inputGroup">
                        <button id="atlt_chatGPT_btn" class="notranslate button button-primary">ChatGPT Translate</button>
                        <br/><a href="https://chat.openai.com/" target="_blank"><img  class="pro-features-img" src="${chatGPTPreviewImg}" alt="powered by ChatGPT Translate"></a>
                    </div>
                    <hr/>

                    <strong class="atlt-heading">Translate Using Gemini AI API</strong>
                    <div class="inputGroup">
                        ${apikey ? '<button id="atlt_geminiAI_btn" class="notranslate button button-primary">Gemini AI Translate</button>' : '<button id="atlt_geminiAI_addApikey_btn" class="notranslate button button-primary">Add API key</button>'}<span class="beta-button"> Beta </span>
                        <br/><a href="https://gemini.google.com/" target="_blank"><img class="pro-features-img" src="${geminiAIPreviewImg}" alt="powered by Gemini AI"></a>
                    </div>
                </div>
            </div>
        `;

        $("body").append(modelHTML);
    }


    // modal to show strings
    function createStringsModal(projectId, widgetType) {
        // Set wrapper, header, and body classes based on widgetType
        let { wrapperCls, headerCls, bodyCls, footerCls, modelId } = getWidgetClasses(widgetType);

        let modelHTML = `
            <div id="${modelId}" class="modal atlt_custom_model  ${wrapperCls} ${rtlClass}">
                <div class="modal-content">
                    <input type="hidden" id="project_id" value="${projectId}"> 
                    ${modelHeaderHTML(widgetType, headerCls)}   
                    ${modelBodyHTML(widgetType, bodyCls)}   
                    ${modelFooterHTML(widgetType, footerCls)} 
                    </div>
                </div>`;

        $("body").append(modelHTML);
    }

    // Get widget classes based on widgetType
    function getWidgetClasses(widgetType) {
        let wrapperCls = '';
        let headerCls = '';
        let bodyCls = '';
        let footerCls = '';
        let modelId = '';
        switch (widgetType) {
            case 'yandex':
                wrapperCls = 'yandex-widget-container';
                headerCls = 'yandex-widget-header';
                bodyCls = 'yandex-widget-body';
                footerCls = 'yandex-widget-footer';
                modelId = 'yandex-widget-model';
                type = 'yandex';
                break;
            case 'google':
                wrapperCls = 'google-widget-container';
                headerCls = 'google-widget-header';
                bodyCls = 'google-widget-body';
                footerCls = 'google-widget-footer';
                modelId = 'google-widget-model';
                type = 'google';
                break;
            case 'deepl':
                wrapperCls = 'deepl-widget-container';
                headerCls = 'deepl-widget-header';
                bodyCls = 'deepl-widget-body';
                footerCls = 'deepl-widget-footer';
                modelId = 'deepl-widget-model';
                type = 'deepl';
                break;
            case 'chatGPT':
                wrapperCls = 'chatGPT-widget-container';
                headerCls = 'chatGPT-widget-header';
                bodyCls = 'chatGPT-widget-body';
                footerCls = 'chatGPT-widget-footer';
                modelId = 'chatGPT-widget-model';
                type = 'chatGPT';
                break;
            case 'geminiAI':
                wrapperCls = 'geminiAI-widget-container';
                headerCls = 'geminiAI-widget-header';
                bodyCls = 'geminiAI-widget-body';
                footerCls = 'geminiAI-widget-footer';
                modelId = 'geminiAI-widget-model';
                type = 'geminiAI';
                break;
            default:
                // Default class if widgetType doesn't match any case
                wrapperCls = 'yandex-widget-container';
                headerCls = 'yandex-widget-header';
                bodyCls = 'yandex-widget-body';
                footerCls = 'yandex-widget-footer';
                break;
        }
        return { wrapperCls, headerCls, bodyCls, footerCls, modelId, type };
    }
    function modelBodyHTML(widgetType, bodyCls) {
        const translator_type = `${type}`;
        const capitalizedString = capitalizeFirstLetter(translator_type);
        function capitalizeFirstLetter(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
        const HTML = `<div class = "modal-scrollbar">
        <div class="notice inline notice-info is-dismissible">
                        Plugin will not translate any strings with HTML or special characters because ${capitalizedString} Translator currently does not support HTML and special characters translations.
                        You can edit translated strings inside Loco Translate Editor after merging the translations. Only special characters (%s, %d) fixed at the time of merging of the translations.
                    </div>
                    <div class="notice inline notice-info is-dismissible">
                        Machine translations are not 100% correct.
                        Please verify strings before using on the production website.
                    </div>
        <div class="modal-body  ${bodyCls}">
            <div class="atlt_translate_progress">
                Automatic translation is in progress....<br/>
                It will take a few minutes, enjoy ☕ coffee in this time!<br/><br/>
                Please do not leave this window or browser tab while the translation is in progress...

                <div class="progress-wrapper">
                    <div class="progress-container">
                        <div class="progress-bar" id="myProgressBar"><span id="progressText">0%</span></div>
                    </div>
                </div>
            </div>
            <div class="atlt_translate_limitexceed">
                <div class="limitexceed-wrapper">
                     <button class="close-button">&times;</button>
                    <h2>You have exceeded the API key rate limit.</h2>
                    <h2>Please try again after some time.</h2>
                </div>
            </div>
            ${translatorWidget(widgetType)}
            <div class="atlt_string_container">
                <table class="scrolldown atlt_strings_table">
                    <thead>
                        <th class="notranslate">S.No</th>
                        <th class="notranslate">Source Text</th>
                        <th class="notranslate">Translation</th>
                    </thead>
                    <tbody class="atlt_strings_body">
                    </tbody>
                </table>
            </div>
            <div class="notice-container"></div>
        </div>
        </div>`;
        return HTML;
    }


    function modelHeaderHTML(widgetType, headerCls) {
        if (widgetType === "yandex" || widgetType === "google" || widgetType === "deepl" || widgetType === "geminiAI") {
        const HTML = `
        <div class="modal-header  ${headerCls}">
                        <span class="close">&times;</span>
                        <h2 class="notranslate">Step 2 - Start Automatic Translation Process ${(widgetType === "geminiAI")? "(Beta)":''}</h2>
                        <div class="atlt_actions">
                            <button class="notranslate atlt_save_strings button button-primary" data-type = "${type}" disabled="true">Merge Translation</button>
                        </div>
                        <div style="display:none" class="atlt_stats hidden">
                            Wahooo! You have saved your valuable time via auto translating 
                            <strong class="totalChars"></strong> characters  using 
                            <strong>
                                <a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">
                                    Loco Automatic Translate Addon
                                </a>
                            </strong>
                        </div>
                    </div>
                    `;
        return HTML;
    }else if(widgetType === "chatGPT"){
        const HTML = `
        <div class="modal-header  ${headerCls}">
                        <span class="close">&times;</span>
                        <h2 class="notranslate">Step 2 - Start Automatic Translation Process</h2>
                        <div class="atlt_actions">
                            <button class="notranslate atlt_save_strings button button-primary" data-type = "${type}" disabled="true">Merge Translation</button>
                        </div>
                        <div style="display:none" class="atlt_stats hidden">
                            Wahooo! You have saved your valuable time via auto translating 
                            <strong class="totalChars"></strong> characters  using 
                            <strong>
                                <a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">
                                    Loco Automatic Translate Addon
                                </a>
                            </strong>
                        </div>
                    </div>
                    `;
        return HTML;
    }
    
    }
    function modelFooterHTML(widgetType, footerCls) {
     
        if (widgetType === "yandex" || widgetType === "google" || widgetType === "deepl" || widgetType === "geminiAI") {
        const HTML = ` <div class="modal-footer ${footerCls}">
        <div class="atlt_actions">
            <button class="notranslate atlt_save_strings button button-primary" data-type = "${type}" disabled="true">Merge Translation</button>
        </div>
        <div style="display:none" class="atlt_stats">
            Wahooo! You have saved your valuable time via auto translating 
            <strong class="totalChars"></strong> characters  using 
            <strong>
                <a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">
                    Loco Automatic Translate Addon
                </a>
            </strong>
        </div>
    </div>`;
        return HTML;
        }else if(widgetType === "chatGPT"){
            const HTML = ` <div class="modal-footer ${footerCls}">
            <div class="atlt_actions chatGPT_disable">
            <button data-type = "${type}" class="chatGPT_save_cont button button-primary btn-disabled">Save & Continue</button>
            <button data-type = "${type}" class="chatGPT_save_close button button-primary btn-disabled">Save & Close</button>
        </div>
        <div class="chatGptError"></div>
        <div style="display:none" class="atlt_stats">
            Wahooo! You have saved your valuable time via auto translating 
            <strong class="totalChars"></strong> characters  using 
            <strong>
                <a href="https://wordpress.org/support/plugin/automatic-translator-addon-for-loco-translate/reviews/#new-post" target="_new">
                    Loco Automatic Translate Addon
                </a>
            </strong>
        </div>
        </div>`;
        return HTML;
        }else{
            return '';
        }
    }

    // Translator widget HTML
    function translatorWidget(widgetType) {
        if (widgetType === "yandex") {
            const widgetPlaceholder = '<div id="ytWidget">..Loading</div><br>';
            return `<div class="translator-widget  ${widgetType}">
                    <h3 class="choose-lang">Choose language <span class="dashicons-before dashicons-translation"></span></h3>
                    ${widgetPlaceholder}
                </div>`;
        } else if (widgetType === "google") {
            const widgetPlaceholder = '<div id="google_translate_element"></div>';
            return `<div class="translator-widget  ${widgetType}">
                    <h3 class="choose-lang">Choose language <span class="dashicons-before dashicons-translation"></span></h3>
                    ${widgetPlaceholder}
                </div>`;
        }else if (widgetType === "geminiAI") {
            const widgetPlaceholder = '<div id="geminiAI_translate_element"><button id="geminiAI_translate_button">Gemini AI translate</button> <span class="beta-button"> Beta </span></div>';
            return `<div class="translator-widget  ${widgetType}">
                    <h3 class="choose-lang">Click Here to Translate <span class="dashicons-before dashicons-translation"></span></h3>
                    ${widgetPlaceholder}
                </div>`;
        }else if (widgetType === "deepl") {
            const widgetPlaceholder = '<div id="deepl_translate_element"></div>';
            return `<div class="translator-widget  ${widgetType}">
            <table class="deepl_steps">
            <tr>
            <td>
              <h2>Step 1</h2>
              <p>Download translatable docx file.</p>
              <button  class="button button-primary download_deepl" id="download_deepl_doc">Download Docx</button>
            </td>
            <td>
              <h2>Step 2</h2>
              <p>Visit <a href="https://www.deepl.com/translator" target="_blank">https://www.deepl.com/translator</a><br/>and upload downloaded file inside it<br/>for translations.</p>
            </td>
            </tr>
            <tr>
            <td>
              <h2>Step 3</h2>
              <p>Upload translated docx file here</p>
              <input type="file" id="deepl-open-file">
              <br />
              <span id="lblError" style="color: red;"></span>
              <br />
            </td>
            <td>
              <h2>Step 4</h2>
              <p>Click on "Upload Strings" & "Merge Translation" after this.</p>
              <input type="submit" id="deepl_upload_strings_btn" value="Upload Strings" />
            </td>
            </tr>
            </table>
            ${widgetPlaceholder}
            </div>`;
        }else if (widgetType === "chatGPT"){
            currentTab = 0;
            const widgetPlaceholder = '<div id="chatGPT_translate_element"></div>';
            return `<div class="translator-widget  ${widgetType}">
            <div class="chatGPT_progress">
          <div id="chatGPT_progressbar" style="width: 0%"></div>
        </div>
            <form id="Form">
            <div id="tabContainer">
            <button style="float:right; font-size:14px;" class="button button-primary prev_btn" id="prevButton" disabled="true" type="button">&#8249; Previous</button>
            </div>
            </form>
                ${widgetPlaceholder}
            </div>`;
        }else {
            return ''; // Return an empty string for non-yandex widget types
        }
    }
    // oninit
    $(document).ready(function () {
        initialize();
    });


})(window, jQuery, gTranslateWidget);


