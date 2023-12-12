window.addEventListener('load', function () {

    loadGrowth();
    loadBubbles();
    loadEmChart();
    loadVideosOverlay('.sessions-chart');
    loadViralVideos();
    loadProjection();

});

function loadGrowth() {
    // Select the div where the graph will be rendered
    const chartDiv = d3.select('.growth-chart');

    // Set the dimensions of the graph
    const margin = { top: 20, right: 20, bottom: 30, left: 60 },
        width = 900 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // Append the svg object to the div
    const svg = chartDiv.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse the Date / time
    const parseDate = d3.timeParse("%Y-%m");
    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

    // Set the ranges
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Define the line
    const valueline = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.cumulativeOrders));

    // Read the data from the CSV file
    d3.csv("data/orders_over_time.csv").then(data => {
        // Format the data and calculate cumulative orders
        let cumulativeOrders = 0;
        data.forEach(d => {
            d.date = parseDate(d.month);
            d.month = monthNames[d.date.getMonth()];
            cumulativeOrders += +d.orders;
            d.cumulativeOrders = cumulativeOrders;
        });

        // Scale the range of the data
        x.domain(d3.extent(data, d => d.date));
        y.domain([0, d3.max(data, d => d.cumulativeOrders)]); // Start the y-axis at -5 orders

        // Add the X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%B")))
            .attr("stroke", "white")
            .selectAll("text")
            .style("font-weight", 100)
            .style("font-family", "Helvetica");

        // Add the valueline path
        const path = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 3) // Half of the original stroke width
            .attr("d", valueline);

        // Animate the line drawing
        const totalLength = path.node().getTotalLength();
        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .attr("margin-bottom", "10px")
            .transition()
            .duration(5000)
            .attr("stroke-dashoffset", 0);

        // Add gridlines
        // Add the X Gridlines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`)
            .attr("stroke-width", 0.1)
            .call(d3.axisBottom(x)
                .tickSize(-height)
                .tickFormat("")
            )
            .attr("stroke", "rgba(255, 255, 255, 0.1)"); // White at 10% opacity


        // Add a tooltip for total orders
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("border", "1px solid white")
            .style("background", "rgba(0, 0, 0, 0.7)")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("color", "white")
            .style("position", "absolute")
            .style("width", "200px");

        // Add the points on the line and bind tooltip
        svg.selectAll("dot")
            .data(data)
            .enter().append("circle")
            .attr("r", 20)
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.cumulativeOrders))
            .style("opacity", 0)
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(100)
                    .style("opacity", .9);
                tooltip.html("Month: " + d.month + "<br/>"  + "Total Orders: " + d.cumulativeOrders)
                    .style("left", (d3.event.pageX + 10) + "px") // Adjusted the tooltip position to follow the mouse cursor
                    .style("top", (d3.event.pageY - 28) + "px"); // Adjusted the tooltip position to follow the mouse cursor
            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(10000)
                    .style("opacity", 0);
            });
    });
}

function loadBubbles() {
    d3.csv("data/sales_by_shipping_location.csv").then(data => {
        data.forEach(function(d) {
            d.totalSales = +d.total_sales/200;
            d.marketShare = (d.total_sales / 131695.16) * 100;
        });

        data.sort((a, b) => b.totalSales - a.totalSales);

        const bubbleChartDiv = d3.select('.contributing-markets-chart');
        const svg = bubbleChartDiv.append("svg")
            .attr("width", 900)
            .attr("height", 600)
            .attr("class", "bubbles");

        const width = +svg.attr("width");
        const height = +svg.attr("height");

        const simulation = d3.forceSimulation(data)
            .force("x", d3.forceX(width / 2).strength(0.05))
            .force("y", d3.forceY(height / 2).strength(0.05))
            .force("collide", d3.forceCollide(d => d.totalSales + 5))
            .on("tick", ticked);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("border", "1px solid white")
            .style("background", "rgba(0, 0, 0, 0.7)")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("color", "white")
            .style("position", "absolute")
            .style("width", "200px");

        let bubbles;
        let labels;
        function ticked() {
            bubbles = svg.selectAll("circle")
                .data(data, d => d.shipping_region)
                .join("circle")
                .attr("r", d => d.totalSales)
                .attr("fill", function(d) {
                    if (d.shipping_region === "Texas" || d.shipping_region === "New York" || d.shipping_region === "California") {
                        return "#456542";
                    } else {
                        return "#565656";
                    }
                })
                .attr("stroke", "white")
                .attr("stroke-width", 0)
                .on("mouseover", function(d) {
                    tooltip.transition()
                        .duration(100)
                        .style("opacity", .9);
                    tooltip.html("Region: " + d.shipping_region + "<br/>"  + "Total Sales: $" + d3.format(",.2f")(d.total_sales).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "<br/>" + "Market Share: " + d3.format(",.2f")(d.marketShare) + "%")
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(10000)
                        .style("opacity", 0);
                });

            labels = svg.selectAll("text")
                .data(data.slice(0, 4), d => d.shipping_region)
                .join("text")
                .attr("fill", "black")
                .attr("text-anchor", "middle")
                .attr("dy", ".3em")
                .text(d => d.shipping_region);

            bubbles.attr("cx", d => d.x)
                .attr("cy", d => d.y);

            labels.attr("x", d => d.x)
                .attr("y", d => d.y);
        }

        simulation.nodes(data);
        
        const sliderDiv = d3.select('.contributing-markets-chart').append("div")
            .attr("class", "slider");

        const slider = sliderDiv.append("input")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 10)
            .attr("value", 0)
            .style("width", "50vw")
            .on("input", function() {
                const value = +this.value;
                bubbles.style("display", d => d.marketShare >= value ? "block" : "none");
                labels.style("display", d => d.marketShare >= value ? "block" : "none");
            });

        sliderDiv.append("label")
            .style("position", "absolute")
            .style("left", "0")
            .style("margin-left", "500px")
            .text("0%");

        sliderDiv.append("label")
            .style("position", "absolute")
            .style("right", "0")
            .style("margin-right", "470px")
            .text("10%");

        sliderDiv.append("h3")
            .text("% of market share")
            .style("display", "flex")
            .style("margin-top", "10px")
            .style("justify-content", "center")
            .style("align-self", "center");
    });

}

function loadEmChart () {
    d3.csv("data/sessions_by_location.csv").then(data => {
        data.forEach(function(d) {
            d.totalSessions = +d.total_sessions/70;
            d.marketShare = (d.total_sessions / 68509) * 100;
        });

        // Sort data by totalSales
        data.sort((a, b) => b.totalSessions - a.totalSessions);

        const emChartDiv = d3.select('.emerging-markets-chart');
        const svg2 = emChartDiv.append("svg")
            .attr("width", 900)
            .attr("height", 600)
            .attr("class", "bubbles");

        const width = +svg2.attr("width");
        const height = +svg2.attr("height");
    
        const simulation = d3.forceSimulation(data)
            .force("x", d3.forceX(width / 2).strength(0.05))
            .force("y", d3.forceY(height / 2).strength(0.05))
            .force("collide", d3.forceCollide(d => d.totalSessions + 5))
            .on("tick", ticked);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("border", "1px solid white")
            .style("background", "rgba(0, 0, 0, 0.7)")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("color", "white")
            .style("position", "absolute")
            .style("width", "300px");
    

        let emBubbles;
        let labels;
        function ticked() {
            emBubbles = svg2.selectAll("circle")
                .data(data, d => d.location_region)
                .join("circle")
                .attr("r", d => d.totalSessions)
                .attr("fill", d => {
                    if (d.location_region === "Florida" || d.location_region === "Illinois" || d.location_region === "England") {
                        return "#5E4265";
                    } else {
                        return "#565656";
                    }
                })
                .attr("stroke", "white")
                .attr("stroke-width", 0)
                .on("mouseover", function(d) {
                    tooltip.transition()
                        .duration(100)
                        .style("opacity", .9);
                    tooltip.html("Region: " + d.location_region + "<br/>"  + "Total Sessions: " + d3.format(",.2f")(d.total_sessions).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "<br/>" + "% of Total Session Volume: " + d3.format(",.2f")(d.marketShare) + "%")
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(10000)
                        .style("opacity", 0);
                });
    
            labels = svg2.selectAll("text")
                .data(data.slice(0, 4), d => d.location_region)
                .join("text")
                .attr("fill", "black")
                .attr("text-anchor", "middle")
                .attr("dy", ".3em")
                .text(d => d.location_region);
    
            emBubbles.attr("cx", d => d.x)
                .attr("cy", d => d.y);
    
            labels.attr("x", d => d.x)
                .attr("y", d => d.y);
        }
    })
}

function loadVideos(element) {
    const chartDiv = d3.select(element);
    const parseDate = d3.timeParse("%B");
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const margin = { top: 20, right: 20, bottom: 30, left: 60 },
        width = 900 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const x = d3.scaleBand().range([0, width]).padding(0.1);
    const y = d3.scaleLinear().range([height, 0]);

    const svg = chartDiv.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "videos")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("data/tiktok_posts_by_month.csv").then(data => {
        data.forEach(d => {
            d.month = monthNames[parseDate(d.month).getMonth()];
        });

        x.domain(data.map(d => d.month));
        y.domain([0, d3.max(data, d => d.posts)]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll(".tick line").remove();


        data.forEach(d => {
            for(let i = 0; i < d.posts; i++) {
                svg.append("circle")
                    .attr("r", 10)
                    .attr("cx", x(d.month) + x.bandwidth() / 2)
                    .attr("cy", y(0.15) - (i * 20))
                    .attr("fill", "#5E4265");
            }
        });
    });

}

function loadVideosOverlay(element) {
    const chartDiv = d3.select(element);
    const parseDate = d3.timeParse("%B");
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const margin = { top: 20, right: 20, bottom: 30, left: 60 },
        width = 900 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const x = d3.scaleBand().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    const svg = chartDiv.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("class", "videos")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("data/tiktok_posts_by_month.csv").then(data => {
        data.forEach(d => {
            d.month = monthNames[parseDate(d.month).getMonth()];
        });

        x.domain(data.map(d => d.month));
        y.domain([0, d3.max(data, d => d.posts)]);

        svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll(".tick line").remove();

        data.forEach(d => {
            for(let i = 0; i < d.posts; i++) {
                svg.append("circle")
                    .attr("r", 10)
                    .attr("cx", x(d.month) * 1.09)
                    .attr("cy", y(0.15) - (i * 20))
                    .attr("fill", "#5E4265");
            }
        });
    });

}

let visible = false;

function loadSessionLine() {
    if (!visible) {
        const chartDiv = d3.select('.sessions-chart');
        let cumulativeSessions = 0;

        const margin = { top: 20, right: 20, bottom: 30, left: 60 },
            width = 900 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        const svg = chartDiv.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("class", "session-line")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const parseDate = d3.timeParse("%Y-%m");
        const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);

        const valueline = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.total_sessions));

        d3.csv("data/sessions_by_month.csv").then(data => {
            data.forEach(d => {
                d.date = parseDate(d.month);
                d.month = monthNames[d.date.getMonth()];
                cumulativeSessions += +d.total_sessions;
                d.cumulativeSessions = cumulativeSessions;
            });

            x.domain(d3.extent(data, d => d.date));
            y.domain([0, d3.max(data, d => d.total_sessions*1.1)]);

            const path = svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "#424765")
                .attr("stroke-width", 3)
                .attr("d", valueline);

            const totalLength = path.node().getTotalLength();
            path
                .attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .attr("margin-bottom", "10px")
                .transition()
                .duration(5000)
                .attr("stroke-dashoffset", 0);

            svg.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0,${height})`)
                .attr("stroke-width", 0.1)
                .call(d3.axisBottom(x)
                    .tickSize(-height)
                    .tickFormat("")
                )
                .attr("stroke", "rgba(255, 255, 255, 0.1)");
            

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("border", "1px solid white")
                .style("background", "rgba(0, 0, 0, 0.7)")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("color", "white")
                .style("position", "absolute")
                .style("width", "200px");

            svg.selectAll("dot")
                .data(data)
                .enter().append("circle")
                .attr("r", 20)
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.total_sessions))
                .style("opacity", 0)
                .on("mouseover", function(d) {
                    console.log("hover");
                    tooltip.transition()
                        .duration(10)
                        .style("opacity", .9);
                    tooltip.html("Month: " + d.month + "<br/>"  + "Total Sessions: " + d.cumulativeSessions)
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(10000)
                        .style("opacity", 0);
                });
        });
    } else {
        d3.select(".sessions-chart").select(".session-line").remove();
    }
    visible = !visible;
}

function loadViralVideos() {
    let selectedVideo = document.getElementById("select-video").value;

    d3.csv("data/followers_by_video.csv").then(function(data) {
        let totalFollowersFromVideos;

        if (selectedVideo == 0) {
            totalFollowersFromVideos = d3.sum(data, d => +d.followers);
            document.getElementById("video-link").innerHTML = `<a href="https://www.tiktok.com/@fortytwobts">TikTok Profile</a>`;
        } else {
            let filteredData = data.filter(d => d.video == selectedVideo);
            totalFollowersFromVideos = d3.sum(filteredData, d => +d.followers);
            document.getElementById("video-link").innerHTML = `<a href="${filteredData[0].link}">Video ${selectedVideo}</a>`;
        }

        let totalFollowers = 9378; // as of dec 10
        let videoFollowersRatio = Math.ceil((totalFollowersFromVideos / totalFollowers) * 100);
        console.log(videoFollowersRatio);

        d3.select(".viral-videos-chart").select("svg").remove();

        let svg = d3.select(".viral-videos-chart")
            .append("svg")
            .attr("width", 500)
            .attr("height", 500);

        let circles = svg.selectAll("circle")
            .data(d3.range(100))
            .enter()
            .append("circle")
            .attr("cx", (d, i) => (i % 10) * 50 + 25)
            .attr("cy", (d, i) => Math.floor(i / 10) * 50 + 25)
            .attr("r", 24)
            .attr("fill", "#6a6a6a");

        circles.filter((d, i) => i < videoFollowersRatio)
            .attr("fill", "#5e4265");
    });
}

function loadProjection() {

    d3.csv("data/cpc_by_video.csv").then(function(cpcData) {
        d3.csv("data/cr_by_region.csv").then(function(crData) {
            let adSpendSlider = document.getElementById("ad-spend-slider").value;
            let selectedRegion = document.getElementById("select-region").value;
            let selectedVideo = document.getElementById("select-video-projection").value;

            let filteredCrData = crData.filter(d => d.location_region == selectedRegion && d.total_conversion != 0);
            let filteredCpcData = cpcData.filter(d => d.video == selectedVideo);

            let totalAdSpend = adSpendSlider;
            let cpc = filteredCpcData[0].spend / filteredCpcData[0].clicks;
            let projectedGrossRevenue = ( (totalAdSpend / cpc) * filteredCrData[0].total_conversion ) * 78;

            d3.select(".projections-chart").select("svg").remove();

            let svg = d3.select(".projections-chart")
                .append("svg")
                .attr("width", 900)
                .attr("height", 900);

            let xScale = d3.scaleBand()
                .domain(["Total Ad Spend", "Projected Gross Revenue"])
                .range([0, 900])
                .padding(0.4);

            let yScale = d3.scaleLinear()
                .domain([0, 400000])
                .range([600, 0]);

            let bars = svg.selectAll("rect")
                .data([{"label": "Total Ad Spend", "value": totalAdSpend}, {"label": "Projected Gross Revenue", "value": projectedGrossRevenue}])
                .enter()
                .append("rect")
                .attr("x", d => xScale(d.label))
                .attr("y", d => yScale(d.value))
                .attr("width", xScale.bandwidth())
                .attr("height", d => 600 - yScale(d.value))
                .attr("fill", d => {
                    if (selectedRegion === "Texas" || selectedRegion === "New York" || selectedRegion === "California") {
                        return "#456542";
                    } else {
                        return "#5E4265";
                    }
                });

            bars.on("mouseover", function(d) {
                let tooltip = d3.select(".projections-chart")
                    .append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("border", "1px solid white")
                    .style("background", "rgba(0, 0, 0, 0.7)")
                    .style("padding", "10px")
                    .style("border-radius", "5px")
                    .style("color", "white")
                    .style("position", "absolute")
                    .style("display", "flex")
                    .style("justify-content", "center")
                    .style("align-items", "center")
                    .style("width", "90px");
    

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                tooltip.html("$" + d3.format(",.2f")(d.value))
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 27) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(".tooltip").remove();
            });

            svg.append("g")
                .attr("transform", "translate(0," + 600 + ")")
                .call(d3.axisBottom(xScale));

            svg.append("g")
                .call(d3.axisLeft(yScale));

            svg.append("g")			
                .attr("class", "grid")
                .attr("opacity", 0.2)
                .call(d3.axisLeft(yScale)
                    .tickSize(-900)
                    .tickFormat("")
                );
        });
    });
}
